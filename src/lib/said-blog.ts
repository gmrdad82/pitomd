type Entry = {
  id: string;
  data: { pubDate: Date; published: boolean };
};

export function released<T extends Entry>(posts: T[], now = new Date()): T[] {
  return posts
    .filter(
      (post) =>
        post.data.published && post.data.pubDate.getTime() <= now.getTime(),
    )
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export type Badge = "draft" | "scheduled" | null;

export function withBadges<T extends Entry>(
  posts: T[],
  now = new Date(),
): { post: T; badge: Badge }[] {
  return [...posts]
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .map((post) => ({
      post,
      badge: !post.data.published
        ? ("draft" as const)
        : post.data.pubDate.getTime() > now.getTime()
          ? ("scheduled" as const)
          : null,
    }));
}

export function related<T extends Entry>(
  current: T,
  posts: T[],
  now = new Date(),
  take = 3,
): T[] {
  return released(posts, now)
    .filter((post) => post.id !== current.id)
    .slice(0, take);
}

export function stamp(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
