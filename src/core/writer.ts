import { PlyJs } from './plyjs';

/**
 * Writes a PlyData object to an async writable text stream (ASCII format).
 *
 * @param stream - WritableStream writer to which the ASCII PLY content will be written
 * @param ply - The PlyData object to be serialized and written
 */
export async function writePly(
  stream: WritableStreamDefaultWriter<string>,
  ply:PlyJs 
): Promise<void> {
  await stream.write(ply.header + '\n');

  for (const element of ply.elements) {
    for (const record of element.data) {
      const lineParts: string[] = [];
      for (const prop of element.properties) {
        const value = record[prop.name];
        if ('lenType' in prop) {
          const list = value as number[];
          lineParts.push(String(list.length));
          lineParts.push(...list.map(v => String(v)));
        } else {
          lineParts.push(String(value));
        }
      }
      await stream.write(lineParts.join(' ') + '\n');
    }
  }

  await stream.close();
}

