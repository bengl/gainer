import { createServer, Server, Socket } from 'net';

export function makeServer(cb: (server: Server) => void): void {
  const server = createServer((socket: Socket) => {
    let query: string = '';
    socket.on('data', d => {
      const data = d.toString();
      query += data;
      if (query.endsWith('\r\n')) {
        route(query.trim(), socket);
      }
    });
  });
  server.listen(0, () => {
    cb(server);
  });

}

function route(query: string, socket: Socket): void {
  homepage(socket);
}

function homepage(socket: Socket): void {
  const data = [
    '',
    `Welcome to Geomys Gopher Client!`, // TODO get name and version from package.json
    '',
    'Key commands:',
    'b     : back',
    'f     : forward',
    'g     : go to a gopher url',
    'Up    : move selector up the page',
    'Down  : move the selector down the page',
    'Enter : open the selected menu item (link)',
    '',
  ].map(line => [`i${line}`, '', 'error.host', '1'].join('\t')).join('\r\n') +
    '\r\n1gopher.floodgap.com\t\tgopher.floodgap.com\t70' + 
    '\r\n.\r\n';
  socket.write(data);
  socket.end();
}
