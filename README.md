# storytelling-map
Proof of concept Plugin for travel journal with text tracking map

Inspired by https://tympanus.net/Development/StorytellingMap/
I found https://github.com/atlefren/storymap 
decided to get rid of jQuery and add some functionality

## 📍 Demos

**[View All Demos](demo/demos.html)** - Interactive gallery showcasing different features and configurations

**Quick Links:**
- [Full Features Demo](demo/index.html) - Comprehensive feature showcase
- [Multiple Maps](demo/multimap.html) - Two maps on one page
- [Mouseover Trigger](demo/demo-mouseover.html) - Hover to navigate
- [Control Panel](demo/demo-controls.html) - Interactive settings
- [Custom Markers](demo/demo-markers.html) - Styled markers and colors
- [Mobile Layouts](demo/demo-mobile.html) - Responsive design
- [Curved Paths](demo/demo-paths.html) - Advanced path styling
- [Minimal Setup](demo/demo-minimal.html) - Quick start guide
- [Custom Tiles](demo/demo-tiles.html) - Different basemaps
- [Combined Triggers](demo/demo-both-triggers.html) - Scroll & hover
- [Title Trigger](demo/demo-title-trigger.html) - Long-form articles with title-based navigation
- [Hierarchical Markers](demo/demo-hierarchical.html) - Zoom-based marker visibility for drill-down navigation

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
  data-hidden="true"            <!-- Hide marker (invisible on map, optional, default: false) -->
  data-marker-color="#FF0000"   <!-- Marker pin color in hex format (optional) -->
  data-marker-icon="path/to/icon.png" <!-- Custom marker icon URL (optional) -->
  data-marker-icon-size="[32,32]" <!-- Custom icon size [width,height] (optional) -->
  data-min-zoom="6"             <!-- Show marker only when zoom >= 6 (optional) -->
  data-max-zoom="12"            <!-- Show marker only when zoom <= 12 (optional) -->
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

  // Responsive behavior
  mobileBreakpoint: 768,        // Pixels; below this width uses mobile behavior (default: 768)
  mobileLayout: 'normal',       // 'normal' (left-right), 'above' (map above text)
  disableOnSmallResolution: false, // If true, StoryMap is not initialized on small screens (no map load, callbacks, or events)
  
  // Selector for sections
  selector: '[data-place]',     // CSS selector for sections (default: '[data-place]')
  
  // Breakpoint positioning
  breakpointPos: '33.333%',     // Vertical position where sections highlight (default: '33.333%')
  
  // Interaction
  markerClickScrollToPlace: true, // Click marker to scroll to section (default: true)
  trigger: 'scroll',             // 'scroll', 'mouseover', or 'both' (default: 'scroll')
  showControlPanel: true        // Show ot Hide Control Panel
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
      hidden: false,             // Hide marker on map (optional, default: false)
      markerColor: '#FF0000',    // Marker color in hex format (optional)
      markerIcon: undefined,     // Custom marker icon URL (optional)
      markerIconSize: [32, 32],  // Custom icon size [width, height] (optional, default: [32, 32])
      minZoom: 6,                // Show marker only when zoom >= 6 (optional)
      maxZoom: 12,               // Show marker only when zoom <= 12 (optional)
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

### Mobile Layout Modes

Configure how map and text behave below `mobileBreakpoint`:

```javascript
StoryMap({
  container: '.main',
  mapContainer: 'map',
  mobileBreakpoint: 768,
  mobileLayout: 'above' // map above text on mobile
});
```

`mobileLayout` options:
- `normal`: keeps map/text side-by-side (left-right)
- `above`: places map above text
- `hidden`: hides map on small screens

### Disable StoryMap on Small Screens

To completely skip map initialization on small screens (no map load, callbacks, or event listeners):

```javascript
StoryMap({
  container: '.main',
  mapContainer: 'map',
  disableOnSmallResolution: true,
  mobileBreakpoint: 768
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

### Hidden Markers

Hide a marker on the map while keeping it as a functional navigation point:

**Using HTML Attributes**
```html
<section data-place="hidden-location" data-lat="59.92" data-lon="10.75" data-hidden="true">
  <h2>Hidden Location</h2>
  <p>This marker won't show as a pin on the map...</p>
</section>
```

**Using JavaScript Markers Object**
```javascript
markers: {
  hiddenLocation: { 
    lat: 59.92, 
    lon: 10.75,
    hidden: true,
    tooltip: "This won't be visible"
  }
}
```

Hidden markers:
- Are not rendered on the map at all
- Still trigger fly-to animations during scrolling
- Still work with paths if connected to other markers

### Zoom-Based Marker Visibility

Show or hide markers by zoom level:

- `minZoom`: marker renders only when current zoom is greater than or equal to this value
- `maxZoom`: marker renders only when current zoom is less than or equal to this value
- Combine both to render a marker only within a zoom range

**HTML attributes**
```html
<section data-place="city" data-lat="59.92" data-lon="10.75" data-min-zoom="8" data-max-zoom="12">
  <h2>City level marker</h2>
</section>
```

**JavaScript markers object**
```javascript
markers: {
  city: { lat: 59.92, lon: 10.75, minZoom: 8, maxZoom: 12 }
}
```

### Marker Styling

Customize marker appearance with colors or custom icons.

**Colored Markers**
Use hex color codes to change marker pin colors:

```html
<section data-place="oslo" data-lat="59.92" data-lon="10.75" 
         data-marker-color="#FF0000">
  <h2>Red Pin</h2>
</section>

<section data-place="bergen" data-lat="60.39" data-lon="5.32" 
         data-marker-color="#0000FF">
  <h2>Blue Pin</h2>
</section>
```

Or with JavaScript:
```javascript
markers: {
  oslo: { lat: 59.92, lon: 10.75, markerColor: '#FF0000' },
  bergen: { lat: 60.39, lon: 5.32, markerColor: '#0000FF' }
}
```

**Custom Icon Images**
Use custom icon URLs:

```html
<section data-place="oslo" data-lat="59.92" data-lon="10.75" 
         data-marker-icon="path/to/custom-icon.png">
  <h2>Custom Icon Location</h2>
</section>
```

Or with JavaScript:
```javascript
markers: {
  oslo: { 
    lat: 59.92, 
    lon: 10.75, 
    markerIcon: 'path/to/custom-icon.png',
    markerIconSize: [32, 32]  // Optional: customize icon size
  }
}
```

Marker styling priority:
1. **Hidden markers** - Use invisible icons (if `hidden: true`)
2. **Custom icons** - Display custom image (if `markerIcon` is set)
3. **Colored markers** - Display colored pin (if `markerColor` is set)
4. **Default** - Use Leaflet's default marker

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