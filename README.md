# Distributed Spatial Internet Graph Beacon

Adding the beacon will get your spatial web app discovered across a distributed network of spatial internet graphs.

## Current Functionality

As of today, the beacon simply sends some basic metadata about the embedding app (name, description, and URL) to a specified relay endpoint for indexing.

## Usage

```js
import Beacon from 'sig-beacon';

const beacon = new Beacon("<BASE_RELAY_URL>");
await beacon.signal();
```

Ensure the relay URL is valid and without subdirectories, e.g. `https://relay.zesty.xyz/`.
