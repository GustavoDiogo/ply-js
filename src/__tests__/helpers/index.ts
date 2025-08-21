// Helper to turn a string into an AsyncIterable<string>
export async function* asyncLinesFromString(str: string): AsyncIterable<string> {
  for (const line of str.split(/\r?\n/)) {
    yield line;
  }
}