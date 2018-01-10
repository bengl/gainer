"use strict";

const blessed = require('blessed');
const { Browser } = require('./lib/browser');
const { makeServer } = require('./lib/startpage');
const open = require('opener');

const screen = blessed.screen({
  autoPadding: true,
  warnings: true
});

let enterHandlers = [];

let server;

const list = blessed.list({
  scrollbar: true,
  keys: true,
  selectedBg: 'green',
  parseTags: true
});

screen.append(list);

list.focus();

screen.key('q', function() {
  if (server) {
    server.close();
  }
  return screen.destroy();
});

screen.key('left', () => {
  browser.back();
});

screen.key('right', () => {
  browser.forward();  
});

screen.key('g', () => {
  const prompt = blessed.prompt({
    top: 'center',
    left: 'center',
    border: { type: 'line' },
    height: 8
  });
  screen.append(prompt);
  prompt.input('Enter the URL:', '', (err, url) => {
    prompt.destroy();
    if (url) {
      browser.go(url);
    } else {
      screen.render();
    }
  });
});

screen.key('enter', () => {
  enterHandlers[list.selected]();
});

screen.render();

let types = [];

function lineItemsToLines(lineItems) {
  const handlers = [];
  types.length = 0;
  const lines = lineItems.map((item, i) => {
    types[i] = item.leader;
    switch (item.itemType) {
      case 'info':
        handlers.push(() => {});
        return `       ${item.display}`;
      case 'menu':
        handlers.push(() => {
          browser.go(item.url);
        });
        return `[MENU] ${item.display}`;
      case 'html':
        handlers.push(() => {
          open(`${item.selector.replace(/^URL:/, '')}`);
        });
        return `[HTML] ${item.display} (${item.selector})`;
      case 'text-file':
        handlers.push(() => {
          browser.go(item.url);
        });
        return `[TEXT] ${item.display}`;
      case 'search':
        handlers.push(makeSearch(item));
        return `[SRCH] ${item.display}`;
      case 'end':
        handlers.push(() => {});
        return '.';
      default:
        handlers.push(() => {});
        return `[????] ${item.display} (${item.itemType})`;
    } 
  });
  enterHandlers = handlers;
  return lines;
}

function makeSearch(item) {
  return () => {
    const prompt = blessed.prompt({
      top: 'center',
      left: 'center',
      border: { type: 'line' },
      height: 8
    });
    screen.append(prompt);
    prompt.input('Search text:', '', (err, query) => {
      if (query && !err) {
        browser.go(`gopher://${item.hostname}:${item.port}${item.selector}\t${query}`);
      }
    });
  };
}

const browser = new Browser(items => {
  list.setItems(lineItemsToLines(items));
  screen.render();
}, err => {
  const message = blessed.message({
    top: 'center',
    left: 'center',
    border: { type: 'line' },
    height: 8
  });
  screen.append(message);
  message.error(err.message, 0);
});

if (process.argv[2]) {
  browser.go(process.argv[2]);
} else {
  makeServer(_server => {
    server = _server;
    browser.go(`gopher://localhost:${server.address().port}`);
  });
}
