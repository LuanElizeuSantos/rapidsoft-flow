import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, Connect } from 'vite';

const CONFIG_REL = 'data/consistem-flow-config.json';

/** Em dev, persiste o fluxo em arquivo para versionar com Git. */
export function flowConfigFilePlugin(): Plugin {
  let configPath = '';

  return {
    name: 'flow-config-file',
    configResolved(config) {
      configPath = path.resolve(config.root, CONFIG_REL);
    },
    configureServer(server) {
      server.middlewares.use(((
        req: Connect.IncomingMessage,
        res: Connect.ServerResponse,
        next: Connect.NextFunction,
      ) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/flow-config') {
          next();
          return;
        }

        if (req.method === 'GET') {
          if (!fs.existsSync(configPath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end('{}');
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(fs.readFileSync(configPath, 'utf8'));
          return;
        }

        if (req.method === 'PUT' || req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8');
              const parsed = JSON.parse(raw);
              fs.mkdirSync(path.dirname(configPath), { recursive: true });
              fs.writeFileSync(
                configPath,
                `${JSON.stringify(parsed, null, 2)}\n`,
                'utf8',
              );
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end('{"ok":true}');
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, erro: String(err) }));
            }
          });
          return;
        }

        if (req.method === 'DELETE') {
          if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end('{"ok":true}');
          return;
        }

        res.statusCode = 405;
        res.end('Method not allowed');
      }) as Connect.NextHandleFunction);
    },
  };
}
