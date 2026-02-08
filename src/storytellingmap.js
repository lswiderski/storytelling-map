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
            const map = L.map(options.mapContainer ?? 'map').setView([65, 18], 5);

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

    function parseMarkersFromElements(element) {
        const markers = {};
        const elements = element.querySelectorAll(settings.selector);

        Array.from(elements).forEach(function (el) {
            const place = el.dataset.place;
            const lat = el.dataset.lat;
            const lon = el.dataset.lon;
            if (place && lat && lon) {
                markers[place] = {
                    lat: parseFloat(el.dataset.lat),
                    lon: parseFloat(el.dataset.lon),
                    zoom: el.dataset.zoom ? parseInt(el.dataset.zoom) : 10
                };
                // Add createPathToNext property if present
                if (el.dataset.createPathToNext !== undefined) {
                    markers[place].createPathToNext = el.dataset.createPathToNext === 'true';
                }
                // Add marker tooltip if present
                if (el.dataset.tooltip) {
                    markers[place].tooltip = el.dataset.tooltip;
                }
                // Add marker popup if present
                if (el.dataset.popup) {
                    markers[place].popup = el.dataset.popup;
                }
                // Add path tooltip if present
                if (el.dataset.pathTooltip) {
                    markers[place].pathTooltip = el.dataset.pathTooltip;
                }
                // Add path popup if present
                if (el.dataset.pathPopup) {
                    markers[place].pathPopup = el.dataset.pathPopup;
                }
                // Add path curved property if present
                if (el.dataset.curved !== undefined) {
                    markers[place].curved = el.dataset.curved !== 'false';
                }
                // Add path curve direction if present
                if (el.dataset.curveDirection) {
                    markers[place].curveDirection = el.dataset.curveDirection;
                }
                // Add hidden property if present
                if (el.dataset.hidden !== undefined) {
                    markers[place].hidden = el.dataset.hidden === 'true';
                }
                // Add marker color if present
                if (el.dataset.markerColor) {
                    markers[place].markerColor = el.dataset.markerColor;
                }
                // Add marker icon URL if present
                if (el.dataset.markerIcon) {
                    markers[place].markerIcon = el.dataset.markerIcon;
                }
                // Add marker icon size if present
                if (el.dataset.markerIconSize) {
                    try {
                        markers[place].markerIconSize = JSON.parse(el.dataset.markerIconSize);
                    } catch (e) {
                        console.warn('Invalid markerIconSize format:', el.dataset.markerIconSize);
                    }
                }
            }
        });

        return markers;
    }

    function generateAutoPathsFromMarkers(markers) {
        const markerKeys = Object.keys(markers);
        const autoPaths = [];

        for (let i = 0; i < markerKeys.length - 1; i++) {
            const currentKey = markerKeys[i];
            const nextKey = markerKeys[i + 1];
            const currentMarker = markers[currentKey];

            // Create path to next marker if createPathToNext is true
            if (currentMarker.createPathToNext) {
                const pathObj = {
                    from: currentKey,
                    to: nextKey
                };

                // Add path tooltip if present
                if (currentMarker.pathTooltip) {
                    pathObj.tooltip = currentMarker.pathTooltip;
                }

                // Add path popup if present
                if (currentMarker.pathPopup) {
                    pathObj.popup = currentMarker.pathPopup;
                }

                // Add path curved property if present
                if (currentMarker.curved !== undefined) {
                    pathObj.curved = currentMarker.curved;
                }

                // Add path curve direction if present
                if (currentMarker.curveDirection) {
                    pathObj.curveDirection = currentMarker.curveDirection;
                }

                autoPaths.push(pathObj);
            }
        }

        return autoPaths;
    }

    function getDistanceToTop(elem, breakpointElement) {
        // Use getBoundingClientRect() to get viewport position, then add scrollY for absolute page position
        const elemRect = elem.getBoundingClientRect();
        const elemCenter = window.scrollY + elemRect.top + elemRect.height / 2;

        // Get breakpoint position - it's fixed to viewport at breakpointPos percentage
        const breakpointViewportPos = window.innerHeight * parseFloat(settings.breakpointPos) / 100;
        const breakpointPagePos = window.scrollY + breakpointViewportPos;

        // Return distance and whether element is above breakpoint
        return {
            distance: elemCenter - breakpointPagePos,
            isAbove: elemCenter < breakpointPagePos
        };
    }

    function highlightTopPara(paragraphs, breakpointElement) {
        const paragraphsArray = Array.from(paragraphs); // Convert NodeList to array

        // Calculate positions for each section
        const sectionData = paragraphsArray.map(function (element) {
            const distObj = getDistanceToTop(element, breakpointElement);
            const elemRect = element.getBoundingClientRect();
            const elemTop = window.scrollY + elemRect.top;
            const elemBottom = window.scrollY + elemRect.top + elemRect.height;

            const breakpointViewportPos = window.innerHeight * parseFloat(settings.breakpointPos) / 100;
            const breakpointPagePos = window.scrollY + breakpointViewportPos;
            const containsBreakpoint = breakpointPagePos >= elemTop && breakpointPagePos <= elemBottom;

            return {
                el: element,
                distance: distObj.distance,
                isAbove: distObj.isAbove,
                containsBreakpoint: containsBreakpoint
            };
        });

        // Priority 1: Find sections that contain the breakpoint
        const containingSections = sectionData.filter(function (item) {
            return item.containsBreakpoint;
        });

        let closest;
        if (containingSections.length > 0) {
            closest = containingSections[0];
        } else {
            // Priority 2: If no sections contain the breakpoint, find sections above and select the closest one
            const aboveSections = sectionData.filter(function (item) {
                return item.isAbove;
            });
            if (aboveSections.length > 0) {
                // Select the closest one above (maximum distance, least negative)
                closest = aboveSections.reduce((max, current) => {
                    return current.distance > max.distance ? current : max;
                }, aboveSections[0]);
            } else {
                // Fallback: use the first section
                closest = sectionData[0];
            }
        }

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

    // Function to create an invisible marker icon
    function createInvisibleIcon() {
        return L.divIcon({
            html: '',
            iconSize: [0, 0],
            className: 'hidden-marker-icon'
        });
    }

    // Function to create a colored marker icon
    function createColoredIcon(color = '#FF0000') {
        // Validate color format
        const validColor = /^#[0-9A-F]{6}$/i.test(color) ? color : '#FF0000';

        return L.divIcon({
            html: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 2C10.48 2 6 6.48 6 12c0 7 10 18 10 18s10-11 10-18c0-5.52-4.48-10-10-10z" 
                          fill="${validColor}" stroke="white" stroke-width="2"/>
                    <circle cx="16" cy="12" r="4" fill="white"/>
                   </svg>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
            className: 'colored-marker-icon'
        });
    }

    // Function to create a custom marker icon from URL
    function createCustomIcon(iconUrl, size = [32, 32]) {
        return L.icon({
            iconUrl: iconUrl,
            iconSize: size,
            iconAnchor: [size[0] / 2, size[1]],
            popupAnchor: [0, -size[1]]
        });
    }

    // Function to get marker icon based on configuration
    function getMarkerIcon(marker) {
        if (marker.hidden) {
            return createInvisibleIcon();
        } else if (marker.markerIcon) {
            // Custom icon URL
            const size = marker.markerIconSize || [32, 32];
            return createCustomIcon(marker.markerIcon, size);
        } else if (marker.markerColor) {
            // Colored marker
            return createColoredIcon(marker.markerColor);
        }
        // Default Leaflet marker
        return undefined;
    }

    // Function to calculate intermediate points for curved paths
    function calculateCurvedPath(fromLat, fromLon, toLat, toLon, curveAmount = 0.05, direction = 'right') {
        const points = [];
        const steps = 50; // Number of points to create smooth curve

        // Add start point
        points.push([fromLat, fromLon]);

        // Calculate midpoint
        const midLat = (fromLat + toLat) / 2;
        const midLon = (fromLon + toLon) / 2;

        // Calculate distance between points
        const dLat = toLat - fromLat;
        const dLon = toLon - fromLon;

        // Calculate perpendicular offset for curve (creates arc)
        const distance = Math.sqrt(dLat * dLat + dLon * dLon);
        let perpLat = dLon / distance;
        let perpLon = -dLat / distance;

        // Reverse perpendicular if direction is 'left'
        if (direction === 'left') {
            perpLat = -perpLat;
            perpLon = -perpLon;
        }

        // Create curved path using bezier-like curve
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            // Quadratic bezier formula with control point offset
            const offsetDistance = Math.sin(t * Math.PI) * distance * curveAmount;
            const curvedLat = fromLat + dLat * t + perpLat * offsetDistance;
            const curvedLon = fromLon + dLon * t + perpLon * offsetDistance;
            points.push([curvedLat, curvedLon]);
        }

        // Add end point
        points.push([toLat, toLon]);

        return points;
    }

    // Function to create paths between markers
    function createPaths(map, markers, paths) {
        // Clear any existing paths
        if (pathsLayerGroup) {
            map.removeLayer(pathsLayerGroup);
        }

        // Generate auto paths from markers with createPathToNext property
        const autoPaths = generateAutoPathsFromMarkers(markers);

        // Combine auto paths with manually specified paths
        const allPaths = [...autoPaths, ...(paths || [])];

        // If no paths, return null
        if (!allPaths || allPaths.length === 0) return null;

        // Create a feature group for all paths
        const layerGroup = L.featureGroup().addTo(map);

        // Create each path
        allPaths.forEach(path => {
            if (!path.from || !path.to || !markers[path.from] || !markers[path.to]) {
                console.warn('Invalid path configuration:', path);
                return;
            }

            const fromMarker = markers[path.from];
            const toMarker = markers[path.to];

            // Determine if path should be curved
            const isCurved = path.curved !== false; // Default to true unless explicitly set to false
            const curveDirection = path.curveDirection || 'right'; // Default direction is right

            // Calculate path coordinates
            let latlngs;
            if (isCurved) {
                latlngs = calculateCurvedPath(
                    fromMarker.lat,
                    fromMarker.lon,
                    toMarker.lat,
                    toMarker.lon,
                    0.05,
                    curveDirection
                );
            } else {
                // Straight path
                latlngs = [
                    [fromMarker.lat, fromMarker.lon],
                    [toMarker.lat, toMarker.lon]
                ];
            }

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
                map.flyTo(initPoint, initZoom, { animate: true, duration: 1.5 });

                // Show all markers in overview mode
                Object.keys(markers).forEach(markerKey => {
                    const marker = markers[markerKey];
                    const markerIcon = getMarkerIcon(marker);
                    const markerOptions = markerIcon ? { icon: markerIcon } : {};
                    const leafletMarker = L.marker([marker.lat, marker.lon], markerOptions).addTo(markerFeatureGroup);

                    // Add tooltip if present
                    if (marker.tooltip) {
                        leafletMarker.bindTooltip(marker.tooltip);
                    }

                    // Add popup if present
                    if (marker.popup) {
                        leafletMarker.bindPopup(marker.popup);
                    }

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
                    const markerIcon = getMarkerIcon(m);
                    const markerOptions = markerIcon ? { icon: markerIcon } : {};
                    const leafletMarker = L.marker([m.lat, m.lon], markerOptions).addTo(markerFeatureGroup);

                    // Add tooltip if present
                    if (m.tooltip) {
                        leafletMarker.bindTooltip(m.tooltip);
                    }

                    // Add popup if present
                    if (m.popup) {
                        leafletMarker.bindPopup(m.popup);
                    }

                    // Add click event to navigate to section if markerClickScrollToPlace is enabled
                    if (settings.markerClickScrollToPlace) {
                        leafletMarker.on('click', function () {
                            showMapView(markerKey);
                            scrollToAndHighlightSection(markerKey);
                        });
                    }
                });

                // Zoom to the selected marker
                map.flyTo([marker.lat, marker.lon], marker.zoom || 10, { animate: true, duration: 1.5 });

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

                // Calculate scroll position to align section CENTER with breakpoint using getBoundingClientRect()
                const sectionRect = section.getBoundingClientRect();
                const sectionCenter = sectionRect.top + sectionRect.height / 2;
                const scrollPos = window.scrollY + sectionCenter - breakpointViewportPos;

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

    const containerElement = document.querySelector(settings.container);
    // Combine markers from both sources: maintain HTML element order as primary
    const markersFromElements = parseMarkersFromElements(containerElement);
    const markers = { ...markersFromElements };

    // Add any markers from settings.markers that don't already exist from elements
    if (settings.markers) {
        Object.keys(settings.markers).forEach(function (key) {
            if (!markers[key]) {
                markers[key] = settings.markers[key];
            }
        });
    }

    makeStoryMap(containerElement, markers);

    // Return public methods if needed
    return {
        // Add any public methods here
    };
}
