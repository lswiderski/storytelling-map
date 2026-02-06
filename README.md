# storytelling-map
Proof of concept Plugin for travel journal with text tracking map

Inspired by https://tympanus.net/Development/StorytellingMap/
I found https://github.com/atlefren/storymap 
decided to get rid of jQuery and add some functionality

DEMO: https://raw.githack.com/lswiderski/storytelling-map/main/demo/index.html

In the future, I would like to create a wordpress plugin based on this feature

## Configuration Guide

### Basic Setup

```javascript
StoryMap({
  container: '.main',           // Container with sections
  mapContainer: 'map',          // Map container ID
  markers: { /* marker data */ }
});
```

### HTML Section Attributes

Each section with `data-place` must have location data:

```html
<section 
  data-place="oslo"             <!-- Marker key/ID -->
  data-lat="59.92173"           <!-- Latitude -->
  data-lon="10.75719"           <!-- Longitude -->
  data-zoom="7"                 <!-- Zoom level (optional, default: 10) -->
  data-tooltip="Oslo"           <!-- Marker tooltip -->
  data-popup="Capital of Norway" <!-- Marker popup -->
  data-create-path-to-next      <!-- Auto-create path to next marker -->
  data-curved="true"            <!-- Enable curved paths (optional, default: true) -->
  data-curve-direction="right"  <!-- Path curve direction: 'left' or 'right' (optional, default: 'right') -->
  data-path-tooltip="To Trondheim" <!-- Tooltip for path to next marker -->
  data-path-popup="Distance: 500km" <!-- Popup for path to next marker -->
>
  <h2>Oslo</h2>
  <p>Content about Oslo...</p>
</section>
```

### StoryMap Options

```javascript
StoryMap({
  // Container elements
  container: '.main',           // Required: CSS selector for sections container
  mapContainer: 'map',          // Required: ID or selector for map div
  
  // Selector for sections
  selector: '[data-place]',     // CSS selector for sections (default: '[data-place]')
  
  // Breakpoint positioning
  breakpointPos: '33.333%',     // Vertical position where sections highlight (default: '33.333%')
  
  // Interaction
  markerClickScrollToPlace: true, // Click marker to scroll to section (default: true)
  trigger: 'scroll',             // 'scroll', 'mouseover', or 'both' (default: 'scroll')
  
  // Map configuration
  createMap: function () {       // Custom map creation function (optional)
    const map = L.map('map').setView([65, 18], 5);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    return map;
  },
  
  // Markers data
  markers: {                     // Marker definitions (optional if using HTML attributes)
    oslo: {
      lat: 59.92173,
      lon: 10.75719,
      zoom: 7,                   // Optional zoom on marker select
      tooltip: 'Oslo',           // Marker tooltip
      popup: 'Capital',          // Marker popup
      createPathToNext: true,    // Auto-create path to next marker
      curved: true,              // Enable curved path (optional)
      curveDirection: 'right'    // 'left' or 'right' (optional)
    }
  },
  
  // Paths configuration
  paths: [                       // Manual path definitions (optional)
    {
      from: 'oslo',
      to: 'trondheim',
      tooltip: 'Route',          // Path tooltip
      popup: 'Info',             // Path popup
      curved: true,              // Enable curve (optional, default: true)
      curveDirection: 'right',   // 'left' or 'right' (optional, default: 'right')
      options: {                 // Leaflet polyline options
        color: 'blue',
        weight: 3,
        opacity: 0.7
      }
    }
  ],
  
  // Default path styling
  pathOptions: {                 // Default polyline options for all paths
    color: 'red',
    weight: 3,
    opacity: 0.7
  },
  
  // Initial view
  initialView: 'overview'        // 'overview' or marker key (optional)
});
```

### Marker Features

Markers can be defined in three ways:

**1. HTML Data Attributes (Recommended for auto-paths)**
```html
<section data-place="oslo" data-lat="59.92" data-lon="10.75" data-zoom="7"
         data-tooltip="Oslo" data-popup="Capital of Norway"
         data-create-path-to-next data-curve-direction="left">
</section>
```

**2. JavaScript Markers Object**
```javascript
markers: {
  oslo: { lat: 59.92, lon: 10.75, zoom: 7, tooltip: "...", popup: "..." }
}
```

**3. Mixed Approach**
Combine both - HTML attributes are parsed first, then merged with markers object. Markers object takes precedence.

### Path Features

**Auto-Generated Paths**
Set `data-create-path-to-next` on a section to automatically create a path to the next marker:
```html
<section data-place="oslo" ... data-create-path-to-next>
```

**Manual Path Definition**
```javascript
paths: [
  {
    from: 'oslo',
    to: 'trondheim',
    curved: false,              // No curve - straight line
    tooltip: 'Route Oslo→Trondheim',
    popup: 'Distance: 500km'
  }
]
```

**Path Styling**
```javascript
// Global defaults for all paths
pathOptions: {
  color: 'red',
  weight: 3,
  opacity: 0.7
}

// Or per-path customization
paths: [
  {
    from: 'oslo',
    to: 'trondheim',
    options: {
      color: 'blue',
      weight: 5
    }
  }
]
```

### Interaction Modes

**Scroll-based highlighting** (default)
```javascript
trigger: 'scroll'  // Highlight section when it crosses breakpoint
```

**Mouseover highlighting**
```javascript
trigger: 'mouseover'  // Highlight section on mouse hover
```

**Both triggers**
```javascript
trigger: 'both'  // Both scroll and mouseover
```

### Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="main" class="main">
    <section data-place="oslo" data-lat="59.92" data-lon="10.75" data-zoom="7"
             data-tooltip="Oslo" data-popup="Capital of Norway"
             data-create-path-to-next data-path-tooltip="To Trondheim">
      <h2>Oslo</h2>
      <p>Content about Oslo...</p>
    </section>
    
    <section data-place="trondheim" data-lat="63.43" data-lon="10.40" data-zoom="7"
             data-tooltip="Trondheim" data-popup="City of Trondheim"
             data-create-path-to-next>
      <h2>Trondheim</h2>
      <p>Content about Trondheim...</p>
    </section>
  </div>
  
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="src/storytellingmap.js"></script>
  <script>
    StoryMap({
      container: '#main',
      mapContainer: 'map',
      breakpointPos: '33.333%',
      pathOptions: { color: 'blue', weight: 2, opacity: 0.6 }
    });
  </script>
</body>
</html>
```