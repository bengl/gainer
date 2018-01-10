import { Readable } from 'stream';
import { connect, Socket } from 'net';

function typeFrom(lead: string): string {
  switch (lead) {
    case '0': return 'text-file';
    case '1': return 'menu';
    case '2': return 'cso';
    case '3': return 'error';
    case '4': return 'mac-file';
    case '5': return 'dos-file';
    case '6': return 'uu-file';
    case '7': return 'search';
    case '8': return 'telnet';
    case '9': return 'bin';
    case '+': return 'mirror';
    case 'g': return 'gif';
    case 'I': return 'image';
    case 'T': return '3270';
    case 'h': return 'html';
    case 'i': return 'info';
    case 's': return 'sound';
    case '.': return 'end';
    default:  return 'unsupported';
  }
}

export class LineItem {
  itemType: string;
  display: string | void;
  selector: string | void;
  hostname: string | void;
  port: number | void;
  leader: string | void;
  raw: string;
  url: string;
  constructor(raw: string, forceInfo?: boolean) {
    this.raw = raw;
    if (forceInfo) {
      this.leader = 'i';
      this.itemType = 'info';
      this.display = raw;
      this.selector = '';
      this.hostname = 'error.host';
      this.port = 1;
    } else {

      this.leader = raw.charAt(0);
      this.itemType = typeFrom(this.leader);
      if (this.itemType === 'end') {
        return;
      }
      const chunks: string[] = raw.substr(1).split('\t');
      if (chunks.length !== 4) {
        this.itemType = 'info';
        this.display = raw;
        return;
      }
      this.display = chunks[0];
      this.selector = chunks[1];
      this.hostname = chunks[2];
      this.port = Number(chunks[3]);
    }
    this.url = `gopher://${this.hostname}:${this.port}${this.selector.replace(/^\//, `/${this.leader}`)}`
  }
}


export function parse(chunk: string): LineItem[] {
  const result = [];
  chunk.split('\x0d\x0a');
  return chunk.split('\r\n')
    .filter(x => !!x.length)
    .map(line => new LineItem(line)); 
}
