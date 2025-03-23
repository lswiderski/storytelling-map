// Ensure Leaflet is loaded
if (typeof L === 'undefined') {
    throw new Error('Storymap requires Leaflet');
}

function StoryMap(options) {
    const defaults = {
        selector: '[data-place]',
        breakpointPos: '33.333%',
        createMap: function () {
            // Create a map in the "map" div, set the view to a given place and zoom
            const map = L.map('map').setView([65, 18], 5);

            // Add an OpenStreetMap tile layer
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            return map;
        },
        trigger: 'scroll' // Default trigger is scroll other options: mouseover, both
    };

    const settings = { ...defaults, ...options };

    let isScrolling = false;

    function getDistanceToTop(elem, top) {
        const docViewTop = window.scrollY;
        const elemTop = elem.offsetTop;
        const dist = elemTop - docViewTop;
        const d1 = top - dist;

        if (d1 < 0) {
            return window.innerHeight;
        }
        return d1;
    }

    function highlightTopPara(paragraphs, top) {
        const distances = Array.from(paragraphs).map(function (element) {
            const dist = getDistanceToTop(element, top);
            return { el: element, distance: dist };
        });

        const closest = distances.reduce((min, current) => {
            return current.distance < min.distance ? current : min;
        }, distances[0]);

        paragraphs.forEach(function (element) {
            if (element !== closest.el) {
                element.dispatchEvent(new CustomEvent('notviewing'));
            }
        });

        if (!closest.el.classList.contains('viewing')) {
            closest.el.dispatchEvent(new CustomEvent('viewing'));
        }
    }

    function watchHighlight(element, searchfor, top) {
        const paragraphs = element.querySelectorAll(searchfor);

        paragraphs.forEach(function (paragraph) {
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
                        paragraphs.forEach(function (p) {
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
                        highlightTopPara(paragraphs, top);
                        window.removeEventListener('scroll', resetOnScroll);
                    }, { once: true });
                });
            }
        });

        if (settings.trigger === 'scroll' || settings.trigger === 'both') {
            window.addEventListener('scroll', function () {
                isScrolling = true;
                highlightTopPara(paragraphs, top);
                setTimeout(() => {
                    isScrolling = false;
                }, 200); // Reset after a short delay
            });
        }
    }

    function makeStoryMap(element, markers) {
        const topElem = document.createElement('div');
        topElem.classList.add('breakpoint-current');
        topElem.style.top = settings.breakpointPos;
        document.body.appendChild(topElem);

        const top = topElem.offsetTop - window.scrollY;

        const searchfor = settings.selector;

        const paragraphs = element.querySelectorAll(searchfor);

        watchHighlight(element, searchfor, top);

        const map = settings.createMap();

        const initPoint = map.getCenter();
        const initZoom = map.getZoom();

        const fg = L.featureGroup().addTo(map);

        function showMapView(key) {
            fg.clearLayers();
            if (key === 'overview') {
                map.setView(initPoint, initZoom, true);
            } else if (markers[key]) {
                const marker = markers[key];
                fg.addLayer(L.marker([marker.lat, marker.lon]));

                map.setView([marker.lat, marker.lon], marker.zoom, 1);
            }
        }

        paragraphs.forEach(function (paragraph) {
            paragraph.addEventListener('viewing', function () {
                showMapView(paragraph.dataset.place);
            });
        });
    }

    makeStoryMap(document.querySelector(settings.container), settings.markers);
}
