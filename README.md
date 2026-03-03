# Beacon

A JavaScript library for registering spatial web experiences with [Relay](https://github.com/zestyxyz/relay) servers. Part of the Distributed Spatial Internet Graph (DSIG).

## What is a Beacon?

Beacons allow 3D/spatial web applications to announce themselves to Relay discovery servers. When you add a beacon to your app:

1. Your world gets indexed on the relay for discovery
2. Active user sessions are tracked in real-time
3. Your world appears in the relay's directory for others to find

## Installation

### NPM

```bash
npm install sig-beacon
```

```js
import Beacon from 'sig-beacon';
```

### CDN

```js
import Beacon from "https://cdn.jsdelivr.net/npm/sig-beacon@0.0.14/index.js";
```

## Quick Start

```js
import Beacon from 'sig-beacon';

const beacon = new Beacon("https://relay.zesty.xyz");
await beacon.signal();
```

That's it! Your world will be registered with the relay and appear in its directory.

## HTML Meta Tags

The beacon automatically reads metadata from your page's `<head>`. Add these meta tags for best results:

```html
<head>
  <!-- Required -->
  <meta name="application-name" content="My Awesome World">
  <meta name="description" content="An immersive 3D experience">

  <!-- Recommended -->
  <meta property="og:url" content="https://myworld.example.com">
  <meta property="og:image" content="https://myworld.example.com/preview.png">
  <meta name="keywords" content="vr,game,multiplayer,adventure">

  <!-- Optional: Mark as adult content -->
  <meta name="rating" content="adult">

  <!-- Optional: Owner verification (see below) -->
  <meta name="zesty-verify" content="your-verification-code">
</head>
```

### Meta Tag Priority

| Data | Primary Source | Fallback |
|------|---------------|----------|
| Name | `application-name` | `document.title` |
| Description | `description` | `og:description` |
| URL | `og:url` | `document.location` |
| Image | `og:image` | A-Frame screenshot (if available) |
| Tags | `keywords` | Empty string |
| Adult | `rating="adult"` | `false` |

## Configuration Options

You can override auto-detected values by passing options to the constructor:

```js
const beacon = new Beacon("https://relay.zesty.xyz", {
  name: "Custom World Name",
  description: "Custom description",
  url: "https://custom-url.example.com",
  image: "https://example.com/custom-preview.png",
  tags: "custom,tags,here",
  stripQueryParams: true  // Remove query params from URL (default: true)
});

await beacon.signal();
```

### BeaconOverride Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Override the world name |
| `description` | string | Override the description |
| `url` | string | Override the canonical URL |
| `image` | string | Override the preview image URL |
| `tags` | string | Override tags (comma-separated) |
| `stripQueryParams` | boolean | Strip query params from auto-detected URL (default: `true`) |

## How It Works

### Registration

When you call `beacon.signal()`, it sends a `PUT` request to the relay's `/beacon` endpoint with your world's metadata:

```json
{
  "url": "https://myworld.example.com",
  "name": "My Awesome World",
  "description": "An immersive 3D experience",
  "image": "https://myworld.example.com/preview.png",
  "tags": "vr,game,multiplayer",
  "adult": false,
  "active": true
}
```

### Session Heartbeats

After registration, the beacon automatically sends heartbeat signals every 5 seconds to track active sessions:

```json
{
  "session_id": "uuid-v4",
  "url": "https://myworld.example.com",
  "timestamp": 1234567890123
}
```

This enables real-time "users online" tracking on the relay.

## Owner Verification

After your world is indexed, you can verify ownership to edit its details on the relay:

1. Visit your world's edit page on the relay (e.g., `https://relay.zesty.xyz/world/my-world/edit`)
2. Click "Get Verification Code" to receive a unique code
3. Add the verification meta tag to your site's `<head>`:
   ```html
   <meta name="zesty-verify" content="your-code-here">
   ```
4. Click "Verify Ownership" on the relay
5. Once verified, you can edit: name, description, image URL, tags, and adult flag

Verification grants a session cookie valid for 7 days.

## Iframe Support

If your world runs inside an iframe, the beacon will attempt to read meta tags from the parent document (same-origin only). For cross-origin iframes, use the override options to specify metadata directly.

## A-Frame Integration

For A-Frame scenes without an `og:image` meta tag, the beacon will automatically capture a screenshot using A-Frame's built-in screenshot component as a fallback.

## Example: Full Integration

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="application-name" content="Space Explorer VR">
  <meta name="description" content="Explore the cosmos in virtual reality">
  <meta property="og:url" content="https://space-explorer.example.com">
  <meta property="og:image" content="https://space-explorer.example.com/preview.jpg">
  <meta name="keywords" content="vr,space,exploration,multiplayer">
</head>
<body>
  <!-- Your 3D content here -->

  <script type="module">
    import Beacon from "https://cdn.jsdelivr.net/npm/sig-beacon@0.0.14/index.js";

    const beacon = new Beacon("https://relay.zesty.xyz");
    await beacon.signal();

    console.log("World registered with relay!");
  </script>
</body>
</html>
```

## Related

- [Relay](https://github.com/zestyxyz/relay) - The discovery server that indexes worlds
- [DSIG Documentation](https://docs.zesty.xyz/graph/overview) - Learn more about the Distributed Spatial Internet Graph

## License

MIT
