// Ensure Leaflet is loaded
if (typeof L === 'undefined') {
    throw new Error('Storymap requires Leaflet');
}

function StoryMap(options) {
    const defaults = {
        selector: '[data-place]',
        breakpointPos: '33.333%',
        markerClickScrollToPlace: true, // Enable marker click to navigate and highlight sections
        createMap: function () {
            // Create a map in the "map" div, set the view to a given place and zoom
            const map = L.map('map').setView([65, 18], 5);

            // Add an OpenStreetMap tile layer
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            return map;
        },
        trigger: 'scroll', // Default trigger is scroll
        paths: [], // Default empty paths array
        pathOptions: {
            color: 'red',
            weight: 3,
            opacity: 0.7
        }
    };

    const settings = { ...defaults, ...options };

    let isScrolling = false;
    let isMarkerNavigation = false; // Flag to track when user clicks a marker
    let pathsLayerGroup = null;
    let markerFeatureGroup = null;

    function getDistanceToTop(elem, breakpointElement) {
        const elemTop = elem.offsetTop;
        const elemCenter = elemTop + elem.offsetHeight / 2;

        // Get breakpoint position - it's fixed to viewport at breakpointPos percentage
        const breakpointViewportPos = window.innerHeight * parseFloat(settings.breakpointPos) / 100;
        const breakpointPagePos = window.scrollY + breakpointViewportPos;

        // Calculate absolute distance from element center to breakpoint
        return Math.abs(elemCenter - breakpointPagePos);
    }

    function highlightTopPara(paragraphs, breakpointElement) {
        const paragraphsArray = Array.from(paragraphs); // Convert NodeList to array

        // Always find the section closest to the breakpoint-current line
        const distances = paragraphsArray.map(function (element) {
            const dist = getDistanceToTop(element, breakpointElement);
            return { el: element, distance: dist };
        });

        const closest = distances.reduce((min, current) => {
            return current.distance < min.distance ? current : min;
        }, distances[0]);

        paragraphsArray.forEach(function (element) {
            if (element !== closest.el) {
                element.dispatchEvent(new CustomEvent('notviewing'));
            }
        });

        if (!closest.el.classList.contains('viewing')) {
            closest.el.dispatchEvent(new CustomEvent('viewing'));
        }
    }

    function watchHighlight(element, searchfor, breakpointElement) {
        const paragraphs = element.querySelectorAll(searchfor);

        Array.from(paragraphs).forEach(function (paragraph) {
            paragraph.addEventListener('viewing', function () {
                paragraph.classList.add('viewing');
            });

            paragraph.addEventListener('notviewing', function () {
                paragraph.classList.remove('viewing');
            });

            if (settings.trigger === 'mouseover' || settings.trigger === 'both') {
                // Add mouseover event listener
                paragraph.addEventListener('mouseover', function () {
                    if (!isScrolling) {
                        Array.from(paragraphs).forEach(function (p) {
                            if (p !== paragraph) {
                                p.dispatchEvent(new CustomEvent('notviewing'));
                            }
                        });
                        if (!paragraph.classList.contains('viewing')) {
                            paragraph.dispatchEvent(new CustomEvent('viewing'));
                        }
                    }
                });

                // Add mouseout event listener to reset on scroll
                paragraph.addEventListener('mouseout', function () {
                    // Reset on scroll if not currently hovered
                    window.addEventListener('scroll', function resetOnScroll() {
                        highlightTopPara(paragraphs, breakpointElement);
                        window.removeEventListener('scroll', resetOnScroll);
                    }, { once: true });
                });
            }
        });

        if (settings.trigger === 'scroll' || settings.trigger === 'both') {
            window.addEventListener('scroll', function () {
                // Skip highlighting if we're in marker navigation mode
                if (isMarkerNavigation) {
                    return;
                }

                isScrolling = true;
                highlightTopPara(paragraphs, breakpointElement);
                setTimeout(() => {
                    isScrolling = false;
                }, 200); // Reset after a short delay
            });

            // Execute highlighting logic on page load
            highlightTopPara(paragraphs, breakpointElement);
        }
    }

    // Function to create paths between markers
    function createPaths(map, markers, paths) {
        // Clear any existing paths
        if (pathsLayerGroup) {
            map.removeLayer(pathsLayerGroup);
        }

        // If no paths, return null
        if (!paths || paths.length === 0) return null;

        // Create a feature group for all paths
        const layerGroup = L.featureGroup().addTo(map);

        // Create each path
        paths.forEach(path => {
            if (!path.from || !path.to || !markers[path.from] || !markers[path.to]) {
                console.warn('Invalid path configuration:', path);
                return;
            }

            const fromMarker = markers[path.from];
            const toMarker = markers[path.to];

            // Ensure coordinates are in the correct format [lat, lng]
            const latlngs = [
                [fromMarker.lat, fromMarker.lon],
                [toMarker.lat, toMarker.lon]
            ];

            // Use custom path options if provided, otherwise use default
            const pathOptions = { ...settings.pathOptions, ...(path.options || {}) };

            // Create and add the polyline to the layer group
            const polyline = L.polyline(latlngs, pathOptions);
            polyline.addTo(layerGroup);

            // Add any additional path properties
            if (path.popup) {
                polyline.bindPopup(path.popup);
            }

            if (path.tooltip) {
                polyline.bindTooltip(path.tooltip);
            }
        });

        // Fit bounds to show all paths
        if (layerGroup.getLayers().length > 0) {
            map.fitBounds(layerGroup.getBounds());
        }

        return layerGroup;
    }

    function makeStoryMap(element, markers) {
        const topElem = document.createElement('div');
        topElem.classList.add('breakpoint-current');
        topElem.style.top = settings.breakpointPos;
        document.body.appendChild(topElem);

        const searchfor = settings.selector;

        watchHighlight(element, searchfor, topElem);

        // Ensure closest section is highlighted on page load
        const paragraphs = element.querySelectorAll(searchfor);
        highlightTopPara(paragraphs, topElem);

        const map = settings.createMap();

        const initPoint = map.getCenter();
        const initZoom = map.getZoom();

        // Create a feature group for markers
        markerFeatureGroup = L.featureGroup().addTo(map);

        // Create paths between markers
        pathsLayerGroup = createPaths(map, markers, settings.paths);

        function showMapView(key) {
            markerFeatureGroup.clearLayers();

            if (key === 'overview') {
                map.setView(initPoint, initZoom, { animate: true, duration: 1.5 });

                // Show all markers in overview mode
                Object.keys(markers).forEach(markerKey => {
                    const marker = markers[markerKey];
                    const leafletMarker = L.marker([marker.lat, marker.lon]).addTo(markerFeatureGroup);

                    // Add click event to navigate to section if markerClickScrollToPlace is enabled
                    if (settings.markerClickScrollToPlace) {
                        leafletMarker.on('click', function () {
                            showMapView(markerKey);
                            scrollToAndHighlightSection(markerKey);
                        });
                    }
                });

                // Make sure paths are visible
                if (pathsLayerGroup) {
                    pathsLayerGroup.addTo(map);
                }
            } else if (markers[key]) {
                const marker = markers[key];

                // Show all markers
                Object.keys(markers).forEach(markerKey => {
                    const m = markers[markerKey];
                    const leafletMarker = L.marker([m.lat, m.lon]).addTo(markerFeatureGroup);

                    // Add click event to navigate to section if markerClickScrollToPlace is enabled
                    if (settings.markerClickScrollToPlace) {
                        leafletMarker.on('click', function () {
                            showMapView(markerKey);
                            scrollToAndHighlightSection(markerKey);
                        });
                    }
                });

                // Zoom to the selected marker
                map.setView([marker.lat, marker.lon], marker.zoom || 10, { animate: true, duration: 1.5 });

                // Make sure paths are visible
                if (pathsLayerGroup) {
                    pathsLayerGroup.addTo(map);
                }
            }
        }

        function scrollToAndHighlightSection(dataPlace) {
            const section = element.querySelector(`[data-place="${dataPlace}"]`);
            if (section) {
                // Set marker navigation flag to prevent intermediate section highlighting
                isMarkerNavigation = true;

                // Calculate breakpoint position in viewport
                const breakpointViewportPos = window.innerHeight * parseFloat(settings.breakpointPos) / 100;

                // Calculate scroll position to align section with breakpoint
                const scrollPos = section.offsetTop - breakpointViewportPos;

                // Immediately highlight the target section (ignore breakpoint)
                const paragraphs = element.querySelectorAll(searchfor);
                Array.from(paragraphs).forEach(function (paragraph) {
                    if (paragraph.dataset.place === dataPlace) {
                        paragraph.dispatchEvent(new CustomEvent('viewing'));
                    } else {
                        paragraph.dispatchEvent(new CustomEvent('notviewing'));
                    }
                });

                // Temporarily disable scroll-based highlighting to avoid conflicts
                isScrolling = true;

                // Scroll to position
                window.scrollTo({ top: scrollPos, behavior: 'smooth' });

                // Keep the target section selected and re-enable normal highlighting after scroll completes
                setTimeout(function () {
                    // Re-enable scroll-based highlighting
                    isScrolling = false;
                    isMarkerNavigation = false;
                }, 500);
            }
        }

        Array.from(element.querySelectorAll(searchfor)).forEach(function (paragraph) {
            paragraph.addEventListener('viewing', function () {
                showMapView(paragraph.dataset.place);
            });
        });

        // Initial view
        if (settings.initialView) {
            showMapView(settings.initialView);
        } else {
            showMapView('overview');
        }
    }

    makeStoryMap(document.querySelector(settings.container), settings.markers);

    // Return public methods if needed
    return {
        // Add any public methods here
    };
}
