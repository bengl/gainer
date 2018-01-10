import { parse as urlParse, Url } from 'url';
import { connect, Socket } from 'net';
import { parse, LineItem } from './parser';

function parseGopherUrl(url: string): [Url, string] {
  let parsedUrl: Url = urlParse(url);
  if (parsedUrl.protocol === null && parsedUrl.host === null && typeof parsedUrl.path === 'string') {
    parsedUrl = urlParse(`gopher://${url}`);
  }
  let type: string = '1';
  if (parsedUrl && parsedUrl.path && parsedUrl.path.length >= 2 && parsedUrl.path.charAt(0) === '/') {
    type = parsedUrl.path.charAt(1);
    const arr = Array.from(parsedUrl.path)
    arr.splice(1,1)
    parsedUrl.path = arr.join('');
  }
  return [parsedUrl, type];
}

const thrower = (err: Error) => {
  throw err;
};

export class Browser {
  history: Url[];
  typesHistory: string[];
  historyIndex: number;
  render: (items: LineItem[]) => void;
  renderError: (err: Error) => void;

  constructor(renderer: (items: LineItem[]) => void, errorRenderer? : (err: Error) => void) {
    this.render = renderer;
    this.renderError = errorRenderer || thrower;
    this.historyIndex = -1;
    this.history = [];
    this.typesHistory = [];
    this.render([]);
  }

  go(goUrl: string) {
    const [parsedUrl, type] = parseGopherUrl(goUrl);
    if (parsedUrl.protocol !== 'gopher:') {
      return;
    }
    if (!parsedUrl.hostname) {
      return;
    }
    this.getPage(parsedUrl, type, () => {
      this.historyIndex += 1;
      this.history[this.historyIndex] = parsedUrl;
      this.typesHistory[this.historyIndex] = type;
      this.history.length = this.historyIndex + 1;
      this.typesHistory.length = this.historyIndex + 1;
    });
  }

  getPage(parsedUrl: Url, type: string, cb?: () => void) {
    const sock: Socket = connect(Number(parsedUrl.port) || 70, parsedUrl.hostname, () => {
      const bufs: Buffer[] = [];
      sock.on('data', (d: Buffer) => {
        bufs.push(d);
      });
      sock.on('end', () => {
        if (type === '0') {
          // TODO separate text file parser
          const page: LineItem[] = Buffer.concat(bufs).toString('ascii')
            .split(/\r?\n/).map(line => new LineItem(line, true));
          this.render(page);
        }
        else if (type === '1' || type === '7') {
          const page: LineItem[] = parse(Buffer.concat(bufs).toString('ascii'));
          this.render(page);
        }
        else {
          const page: LineItem[] = parse(Buffer.concat(bufs).toString('ascii'));
          this.render(page);
        }

        if (cb) {
          cb();
        }
      });
      sock.write(`${parsedUrl && parsedUrl.path ? parsedUrl.path.slice(1).replace(/%09/g, '\t') : ''}\r\n`);
    });
    sock.on('error', err => this.renderError(err));
  }

  forward() {
    if (this.historyIndex === this.history.length - 1) {
      return;
    }
    this.getPage(this.history[this.historyIndex + 1], this.typesHistory[this.historyIndex + 1], () => {
      this.historyIndex += 1;
    })
  }

  back() {
    if (this.historyIndex === 0) {
      return;
    }
    this.getPage(this.history[this.historyIndex - 1],this.typesHistory[this.historyIndex - 1], () => {
      this.historyIndex -= 1;
    })
  }
}
