# Distributed Spatial Internet Graph Beacon

Adding the beacon will get your spatial web app discovered across a distributed network of spatial internet graphs.

## Current Functionality

As of today, the beacon simply sends some basic metadata about the embedding app (name, description, and URL) to a specified relay endpoint for indexing.

## Usage

To ensure the beacon picks up all the relevant information, make sure your setup resembles below:

### JavaScript

```js
import Beacon from 'sig-beacon';

const beacon = new Beacon("<BASE_RELAY_URL>");
await beacon.signal();
```

Ensure the relay URL is valid and without subdirectories, e.g. `https://relay.zesty.xyz/`.

### HTML

```html
<html>
  <head>
    <meta name="description" content="<YOUR_APPLICATION_DESCRIPTION>">
    <meta name="application-name" content="<YOUR_APPLICATION_NAME>">
    <meta name="keywords" content="<comma,separated,keywords>">
    <meta property="og:url" content="<YOUR_APPLICATION_URL>">
    <meta property="og:image" content="<YOUR_APPLICATION_IMAGE>">
    <!-- Any other tags in your page head -->
  </head>
  <body>
    <!-- The rest of your app -->
  </body>
</html>
```
