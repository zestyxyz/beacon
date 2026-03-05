import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { JSDOM } from 'jsdom';

// Set up DOM environment at module level.
// Beacon's `browserContext` field is evaluated at instantiation (not module load),
// so setting globals here before any test runs is sufficient.
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'https://example.com/play/game',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.fetch = async () => ({});

import Beacon from '../index.js';

const RELAY = 'https://relay.example.com';

describe('Beacon', () => {
  let beacon;

  beforeEach(() => {
    dom.window.document.head.innerHTML = '';
    dom.window.document.body.innerHTML = '';
    dom.window.document.title = 'Test Page';
    beacon = new Beacon(RELAY);
  });

  describe('constructor', () => {
    it('sets relay URL', () => {
      assert.equal(beacon.relay, RELAY);
    });

    it('applies overrides from options', () => {
      const b = new Beacon(RELAY, {
        name: 'My World',
        description: 'A cool world',
        url: 'https://custom.com/world',
        image: 'https://custom.com/img.png',
        tags: 'game,3d',
        stripQueryParams: false,
      });
      assert.equal(b.specifiedName, 'My World');
      assert.equal(b.specifiedDescription, 'A cool world');
      assert.equal(b.specifiedUrl, 'https://custom.com/world');
      assert.equal(b.specifiedImage, 'https://custom.com/img.png');
      assert.equal(b.specifiedTags, 'game,3d');
      assert.equal(b.stripQueryParams, false);
    });
  });

  describe('getUrl()', () => {
    it('returns the actual page URL', () => {
      assert.equal(beacon.getUrl(), 'https://example.com/play/game');
    });

    it('does not use og:url meta tag', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      meta.setAttribute('content', 'https://different.com/other-page');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.getUrl(), 'https://example.com/play/game');
    });

    it('does not use data-canonical-url meta tag', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('data-canonical-url', 'https://different.com/other-page');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.getUrl(), 'https://example.com/play/game');
    });

    it('uses specifiedUrl override when set', () => {
      const b = new Beacon(RELAY, { url: 'https://custom.com/world' });
      assert.equal(b.getUrl(), 'https://custom.com/world');
    });

    it('strips query params by default', () => {
      const domWithQuery = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
        url: 'https://example.com/play/game?ref=twitter&utm_source=ad',
      });
      const savedWindow = globalThis.window;
      globalThis.window = domWithQuery.window;
      const b = new Beacon(RELAY);
      assert.equal(b.getUrl(), 'https://example.com/play/game');
      globalThis.window = savedWindow;
    });

    it('includes query params when stripQueryParams is false', () => {
      const domWithQuery = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
        url: 'https://example.com/play/game?level=1',
      });
      const savedWindow = globalThis.window;
      globalThis.window = domWithQuery.window;
      const b = new Beacon(RELAY, { stripQueryParams: false });
      assert.equal(b.getUrl(), 'https://example.com/play/game?level=1');
      globalThis.window = savedWindow;
    });
  });

  describe('getName()', () => {
    it('falls back to document title', () => {
      assert.equal(beacon.getName(), 'Test Page');
    });

    it('returns application-name meta content', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('name', 'application-name');
      meta.setAttribute('content', 'Flat Earth Defense');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.getName(), 'Flat Earth Defense');
    });

    it('uses specifiedName override when set', () => {
      const b = new Beacon(RELAY, { name: 'Override Name' });
      assert.equal(b.getName(), 'Override Name');
    });
  });

  describe('getDescription()', () => {
    it('returns empty string when no description present', () => {
      assert.equal(beacon.getDescription(), '');
    });

    it('returns meta description content', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('name', 'description');
      meta.setAttribute('content', 'A fun 3D game');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.getDescription(), 'A fun 3D game');
    });

    it('handles non-standard description attribute on meta tag', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('name', 'description');
      meta.setAttribute('description', 'Non-standard description');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.getDescription(), 'Non-standard description');
    });

    it('falls back to og:description', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      meta.setAttribute('content', 'OG description');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.getDescription(), 'OG description');
    });

    it('prefers meta description over og:description', () => {
      const metaDesc = dom.window.document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      metaDesc.setAttribute('content', 'Meta description');
      const ogDesc = dom.window.document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      ogDesc.setAttribute('content', 'OG description');
      dom.window.document.head.appendChild(metaDesc);
      dom.window.document.head.appendChild(ogDesc);
      assert.equal(beacon.getDescription(), 'Meta description');
    });

    it('uses specifiedDescription override when set', () => {
      const b = new Beacon(RELAY, { description: 'Custom desc' });
      assert.equal(b.getDescription(), 'Custom desc');
    });
  });

  describe('getTags()', () => {
    it('returns empty string when no keywords meta', () => {
      assert.equal(beacon.getTags(), '');
    });

    it('returns keywords meta content', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('name', 'keywords');
      meta.setAttribute('content', 'game,3d,shooter');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.getTags(), 'game,3d,shooter');
    });

    it('uses specifiedTags override when set', () => {
      const b = new Beacon(RELAY, { tags: 'custom,tags' });
      assert.equal(b.getTags(), 'custom,tags');
    });
  });

  describe('isAdult()', () => {
    it('returns false when no rating meta', () => {
      assert.equal(beacon.isAdult(), false);
    });

    it('returns true for adult content rating', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('name', 'rating');
      meta.setAttribute('content', 'adult');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.isAdult(), true);
    });

    it('returns true for RTA rating', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('name', 'rating');
      meta.setAttribute('content', 'RTA-5042-1996-1400-1577-RTA');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.isAdult(), true);
    });

    it('returns false for non-adult rating', () => {
      const meta = dom.window.document.createElement('meta');
      meta.setAttribute('name', 'rating');
      meta.setAttribute('content', 'general');
      dom.window.document.head.appendChild(meta);
      assert.equal(beacon.isAdult(), false);
    });
  });

  describe('isValidCapture()', () => {
    it('returns false for null', () => {
      assert.equal(beacon.isValidCapture(null), false);
    });

    it('returns false for a short string', () => {
      assert.equal(beacon.isValidCapture('data:image/jpeg;base64,abc'), false);
    });

    it('returns false for exactly 10000 chars', () => {
      assert.equal(beacon.isValidCapture('a'.repeat(10000)), false);
    });

    it('returns true for more than 10000 chars', () => {
      assert.equal(beacon.isValidCapture('a'.repeat(10001)), true);
    });
  });

  describe('findBestCanvas()', () => {
    it('returns null when no canvases present', () => {
      assert.equal(beacon.findBestCanvas(dom.window.document), null);
    });

    it('returns the only canvas when one is present', () => {
      const canvas = dom.window.document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      dom.window.document.body.appendChild(canvas);
      assert.equal(beacon.findBestCanvas(dom.window.document), canvas);
    });

    it('returns the largest canvas by area', () => {
      const small = dom.window.document.createElement('canvas');
      small.width = 100;
      small.height = 100;
      const large = dom.window.document.createElement('canvas');
      large.width = 800;
      large.height = 600;
      dom.window.document.body.appendChild(small);
      dom.window.document.body.appendChild(large);
      assert.equal(beacon.findBestCanvas(dom.window.document), large);
    });

    it('handles canvases with zero area', () => {
      const zero = dom.window.document.createElement('canvas');
      zero.width = 0;
      zero.height = 0;
      const nonzero = dom.window.document.createElement('canvas');
      nonzero.width = 100;
      nonzero.height = 100;
      dom.window.document.body.appendChild(zero);
      dom.window.document.body.appendChild(nonzero);
      assert.equal(beacon.findBestCanvas(dom.window.document), nonzero);
    });
  });
});
