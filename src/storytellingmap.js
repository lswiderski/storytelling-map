// Ensure Leaflet is loaded
if (typeof L === 'undefined') {
    throw new Error('Storymap requires Leaflet');
}

function StoryMap(options) {
    function normalizeTrigger(value) {
        if (value === 'scroll' || value === 'mouseover' || value === 'both') {
            return value;
        }
        return 'scroll';
    }

    function normalizeBreakpointPos(value) {
        const parsed = parseFloat(value);
        if (Number.isNaN(parsed)) {
            return '33.333%';
        }

        const clamped = Math.max(0, Math.min(100, parsed));
        return `${clamped}%`;
    }

    function hasScrollTrigger(trigger) {
        return trigger === 'scroll' || trigger === 'both';
    }

    function hasMouseoverTrigger(trigger) {
        return trigger === 'mouseover' || trigger === 'both';
    }

    function normalizeMobileLayout(value) {
        if (value === 'normal' || value === 'above') {
            return value;
        }
        return 'normal';
    }

    function normalizeMobileBreakpoint(value) {
        const parsed = parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
            return 768;
        }
        return parsed;
    }

    function isSmallResolution() {
        return window.innerWidth < settings.mobileBreakpoint;
    }

    function ensureResponsiveLayoutStyles() {
        const styleId = 'storymap-responsive-layout-styles';
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .storymap-layout-row {
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
            }

            .storymap-layout-row.storymap-mobile-above .storymap-map-col {
                order: 1;
                flex: 0 0 100%;
                max-width: 100%;
                width: 100%;
                min-height: 300px;
            }

            .storymap-layout-row.storymap-mobile-above .storymap-main-col {
                order: 2;
                flex: 0 0 100%;
                max-width: 100%;
                width: 100%;
            }

            .storymap-layout-row.storymap-mobile-normal .storymap-main-col {
                order: 1;
                flex: 0 0 58.3333%;
                max-width: 58.3333%;
            }

            .storymap-layout-row.storymap-mobile-normal .storymap-map-col {
                order: 2;
                flex: 0 0 41.6667%;
                max-width: 41.6667%;
                min-height: 100vh;
                position: sticky;
                top: 0;
            }
        `;

        document.head.appendChild(style);
    }

    function resolveMapContainerElement(mapContainer) {
        if (!mapContainer) {
            return document.getElementById('map');
        }

        if (typeof mapContainer === 'string') {
            if (mapContainer.startsWith('#') || mapContainer.startsWith('.') || mapContainer.includes(' ')) {
                return document.querySelector(mapContainer);
            }

            return document.getElementById(mapContainer) || document.querySelector(mapContainer);
        }

        if (mapContainer instanceof HTMLElement) {
            return mapContainer;
        }

        return null;
    }

    function applyResponsiveLayout(containerElement, mapElement) {
        if (!containerElement || !mapElement || !mapElement.parentElement) {
            return;
        }

        ensureResponsiveLayoutStyles();

        const layoutRow = mapElement.parentElement;
        layoutRow.classList.add('storymap-layout-row');
        containerElement.classList.add('storymap-main-col');
        mapElement.classList.add('storymap-map-col');

        const small = isSmallResolution();
        layoutRow.classList.remove('storymap-mobile-normal', 'storymap-mobile-above');

        if (!small) {
            return;
        }

        const mobileClass = `storymap-mobile-${settings.mobileLayout}`;
        layoutRow.classList.add(mobileClass);
    }

    function ensureControlPanelStyles() {
        const styleId = 'storymap-control-panel-styles';
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .storymap-settings-control.leaflet-control {
                border:none;
            }
            .storymap-settings-control {
                margin-left: 44px;
            }

            .storymap-settings-wrap {
                display: flex;
                align-items: flex-start;
                gap: 6px;
            }

            .storymap-settings-toggle {
                width: 32px;
                height: 32px;
                line-height: 30px;
                text-align: center;
                border: none;
                background: #fff;
                cursor: pointer;
                font-size: 16px;
            }

            .storymap-settings-toggle.storymap-active {
                background: #f4f4f4;
            }

            .storymap-settings-panel {
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 8px;
                min-width: 220px;
            }

            .storymap-settings-panel[hidden] {
                display: none;
            }

            .storymap-settings-panel label {
                display: block;
                font-size: 12px;
                margin-bottom: 8px;
                font-weight: 600;
            }

            .storymap-settings-panel select,
            .storymap-settings-panel input[type="number"] {
                display: block;
                width: 100%;
                margin-top: 4px;
                height: 30px;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 4px 6px;
                font-size: 12px;
                font-weight: normal;
            }

            .storymap-settings-panel .storymap-settings-checkbox {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 8px;
                margin-bottom: 0;
                font-weight: normal;
                font-size: 12px;
            }

            .storymap-settings-panel .storymap-settings-checkbox input {
                margin: 0;
            }
        `;

        document.head.appendChild(style);
    }

    const defaults = {
        selector: '[data-place]',
        breakpointPos: '33.333%',
        mobileBreakpoint: 768,
        mobileLayout: 'normal', // 'normal' (left-right), 'above'
        disableOnSmallResolution: false, // If true and screen is small, map/events/callbacks are not initialized
        markerClickScrollToPlace: true, // Enable marker click to navigate and highlight sections
        mapInitialCenter: [65, 18], // Initial map center point [latitude, longitude]
        mapInitialZoom: 5, // Initial map zoom level
        createMap: function () {
            // Create a map in the "map" div, set the view to a given place and zoom
            const map = L.map(options.mapContainer ?? 'map').setView(settings.mapInitialCenter, settings.mapInitialZoom);

            // Add an OpenStreetMap tile layer
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            return map;
        },
        trigger: 'scroll',  // 'scroll', 'mouseover', or 'both' (default: 'scroll')
        showControlPanel: false,
        controlPanelExpanded: false,
        paths: [], // Default empty paths array
        pathOptions: {
            color: 'red',
            weight: 3,
            opacity: 0.7
        }
    };

    const settings = { ...defaults, ...options };
    settings.trigger = normalizeTrigger(settings.trigger);
    settings.breakpointPos = normalizeBreakpointPos(settings.breakpointPos);
    settings.showControlPanel = Boolean(settings.showControlPanel);
    settings.controlPanelExpanded = Boolean(settings.controlPanelExpanded);
    settings.mobileLayout = normalizeMobileLayout(settings.mobileLayout);
    settings.mobileBreakpoint = normalizeMobileBreakpoint(settings.mobileBreakpoint);
    settings.disableOnSmallResolution = Boolean(settings.disableOnSmallResolution);

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
                // Add min zoom if present
                if (el.dataset.minZoom !== undefined) {
                    const parsedMinZoom = parseInt(el.dataset.minZoom, 10);
                    if (!Number.isNaN(parsedMinZoom)) {
                        markers[place].minZoom = parsedMinZoom;
                    }
                }
                // Add max zoom if present
                if (el.dataset.maxZoom !== undefined) {
                    const parsedMaxZoom = parseInt(el.dataset.maxZoom, 10);
                    if (!Number.isNaN(parsedMaxZoom)) {
                        markers[place].maxZoom = parsedMaxZoom;
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
        const triggerIncludesMouseover = function () {
            return hasMouseoverTrigger(settings.trigger);
        };
        const triggerIncludesScroll = function () {
            return hasScrollTrigger(settings.trigger);
        };

        Array.from(paragraphs).forEach(function (paragraph) {
            paragraph.addEventListener('viewing', function () {
                paragraph.classList.add('viewing');
            });

            paragraph.addEventListener('notviewing', function () {
                paragraph.classList.remove('viewing');
            });

            // Add mouseover event listener
            paragraph.addEventListener('mouseover', function () {
                if (!triggerIncludesMouseover() || isScrolling) {
                    return;
                }

                Array.from(paragraphs).forEach(function (p) {
                    if (p !== paragraph) {
                        p.dispatchEvent(new CustomEvent('notviewing'));
                    }
                });

                if (!paragraph.classList.contains('viewing')) {
                    paragraph.dispatchEvent(new CustomEvent('viewing'));
                }
            });

            // Add mouseout event listener to reset on scroll
            paragraph.addEventListener('mouseout', function () {
                if (!triggerIncludesMouseover()) {
                    return;
                }

                // Reset on scroll if not currently hovered
                window.addEventListener('scroll', function resetOnScroll() {
                    if (triggerIncludesScroll()) {
                        highlightTopPara(paragraphs, breakpointElement);
                    }
                    window.removeEventListener('scroll', resetOnScroll);
                }, { once: true });
            });
        });

        window.addEventListener('scroll', function () {
            if (!triggerIncludesScroll()) {
                return;
            }

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

        // Execute highlighting logic on page load for scroll-enabled triggers
        if (triggerIncludesScroll()) {
            highlightTopPara(paragraphs, breakpointElement);
        }
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
        if (marker.markerIcon) {
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

    // Function to decide if marker should be rendered at current zoom
    function shouldRenderMarker(marker, currentZoom) {
        if (marker.hidden) {
            return false;
        }

        if (marker.minZoom !== undefined && currentZoom < marker.minZoom) {
            return false;
        }

        if (marker.maxZoom !== undefined && currentZoom > marker.maxZoom) {
            return false;
        }

        return true;
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

    function makeStoryMap(element, markers, mapElement) {
        applyResponsiveLayout(element, mapElement);

        const topElem = document.createElement('div');
        topElem.classList.add('breakpoint-current');
        topElem.style.top = settings.breakpointPos;
        document.body.appendChild(topElem);

        const searchfor = settings.selector;
        const paragraphs = element.querySelectorAll(searchfor);

        watchHighlight(element, searchfor, topElem);

        // Ensure closest section is highlighted on page load
        highlightTopPara(paragraphs, topElem);

        const map = settings.createMap();

        window.addEventListener('resize', function () {
            applyResponsiveLayout(element, mapElement);
            map.invalidateSize();
        });

        const initPoint = map.getCenter();
        const initZoom = map.getZoom();

        // Create a feature group for markers
        markerFeatureGroup = L.featureGroup().addTo(map);

        // Create paths between markers
        pathsLayerGroup = createPaths(map, markers, settings.paths);

        let currentViewKey = 'overview';

        function showMapView(key, viewOptions = {}) {
            const { skipFlyTo = false } = viewOptions;
            currentViewKey = key;
            markerFeatureGroup.clearLayers();
            const currentZoom = map.getZoom();

            if (key === 'overview') {
                if (!skipFlyTo) {
                    map.flyTo(initPoint, initZoom, { animate: true, duration: 1.5 });
                }

                // Show all markers in overview mode
                Object.keys(markers).forEach(markerKey => {
                    const marker = markers[markerKey];
                    if (!shouldRenderMarker(marker, currentZoom)) {
                        return;
                    }

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
                    if (!shouldRenderMarker(m, currentZoom)) {
                        return;
                    }

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
                if (!skipFlyTo) {
                    map.flyTo([marker.lat, marker.lon], marker.zoom || 10, { animate: true, duration: 1.5 });
                }

                // Make sure paths are visible
                if (pathsLayerGroup) {
                    pathsLayerGroup.addTo(map);
                }
            }
        }

        function createControlPanel() {
            ensureControlPanelStyles();

            const control = L.control({ position: 'topleft' });

            control.onAdd = function () {
                const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar storymap-settings-control');
                const wrap = L.DomUtil.create('div', 'storymap-settings-wrap', container);
                const toggleButton = L.DomUtil.create('button', 'storymap-settings-toggle', wrap);
                const panel = L.DomUtil.create('div', 'storymap-settings-panel', wrap);

                toggleButton.type = 'button';
                toggleButton.title = 'Map settings';
                toggleButton.setAttribute('aria-label', 'Map settings');
                toggleButton.textContent = '⚙';
                if (!settings.controlPanelExpanded) {
                    panel.hidden = true;
                } else {
                    toggleButton.classList.add('storymap-active');
                }

                panel.innerHTML = `
                    <label>
                        Trigger
                        <select name="trigger">
                            <option value="scroll">scroll</option>
                            <option value="mouseover">mouseover</option>
                            <option value="both">both</option>
                        </select>
                    </label>
                    <label>
                        Breakpoint position (%)
                        <input type="number" name="breakpointPos" min="0" max="100" step="0.1" />
                    </label>
                    <label class="storymap-settings-checkbox">
                        <input type="checkbox" name="markerClickScrollToPlace" />
                        Scroll to place on click
                    </label>
                `;

                const triggerSelect = panel.querySelector('select[name="trigger"]');
                const breakpointInput = panel.querySelector('input[name="breakpointPos"]');
                const markerClickInput = panel.querySelector('input[name="markerClickScrollToPlace"]');

                triggerSelect.value = settings.trigger;
                breakpointInput.value = parseFloat(settings.breakpointPos);
                markerClickInput.checked = settings.markerClickScrollToPlace;

                const applyBreakpointPos = function (rawValue) {
                    settings.breakpointPos = normalizeBreakpointPos(rawValue);
                    topElem.style.top = settings.breakpointPos;
                    highlightTopPara(paragraphs, topElem);
                };

                L.DomEvent.on(toggleButton, 'click', function (e) {
                    L.DomEvent.stop(e);
                    panel.hidden = !panel.hidden;
                    toggleButton.classList.toggle('storymap-active', !panel.hidden);
                });

                triggerSelect.addEventListener('change', function () {
                    settings.trigger = normalizeTrigger(triggerSelect.value);
                    if (hasScrollTrigger(settings.trigger)) {
                        highlightTopPara(paragraphs, topElem);
                    }
                });

                markerClickInput.addEventListener('change', function () {
                    settings.markerClickScrollToPlace = markerClickInput.checked;
                    showMapView(currentViewKey, { skipFlyTo: true });
                });

                breakpointInput.addEventListener('input', function () {
                    if (!Number.isNaN(parseFloat(breakpointInput.value))) {
                        applyBreakpointPos(breakpointInput.value);
                    }
                });

                breakpointInput.addEventListener('change', function () {
                    applyBreakpointPos(breakpointInput.value);
                    breakpointInput.value = parseFloat(settings.breakpointPos);
                });

                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                return container;
            };

            control.addTo(map);
        }

        if (settings.showControlPanel) {
            createControlPanel();
        }

        map.on('zoomend', function () {
            showMapView(currentViewKey, { skipFlyTo: true });
        });

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
    const mapElement = resolveMapContainerElement(settings.mapContainer ?? 'map');

    if (settings.disableOnSmallResolution && isSmallResolution()) {
        applyResponsiveLayout(containerElement, mapElement);
        if (mapElement) {
            mapElement.style.display = 'none';
        }
        return {
            isDisabledForSmallResolution: true,
            mobileBreakpoint: settings.mobileBreakpoint
        };
    }

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

    makeStoryMap(containerElement, markers, mapElement);

    // Return public methods if needed
    return {
        // Add any public methods here
    };
}
