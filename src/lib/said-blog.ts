type Dated = { data: { pubDate: Date } };

export function released<T extends Dated>(posts: T[], now = new Date()): T[] {
  return posts
    .filter((post) => post.data.pubDate.getTime() <= now.getTime())
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function withScheduled<T extends Dated>(
  posts: T[],
  now = new Date(),
): { post: T; scheduled: boolean }[] {
  return [...posts]
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .map((post) => ({
      post,
      scheduled: post.data.pubDate.getTime() > now.getTime(),
    }));
}

export function stamp(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
