import { filterVideosByTags, parseTagQuery, sortVideosByRecency } from "../library";

const baseVideo = (overrides) => ({
  id: "id",
  sourceType: "local",
  uri: "file://video.mp4",
  tags: [],
  createdAt: 1000,
  ...overrides,
});

describe("tag search helpers", () => {
  it("parses tag queries with whitespace and commas", () => {
    expect(parseTagQuery("hiphop house, #popping")).toEqual([
      "hiphop",
      "house",
      "popping",
    ]);
  });

  it("filters videos by tag AND", () => {
    const videos = [
      baseVideo({ id: "a", tags: ["house", "hiphop"] }),
      baseVideo({ id: "b", tags: ["house"] }),
    ];
    expect(filterVideosByTags(videos, "house hiphop", "and")).toHaveLength(1);
    expect(filterVideosByTags(videos, "house hiphop", "and")[0].id).toBe("a");
  });

  it("filters videos by tag OR", () => {
    const videos = [
      baseVideo({ id: "a", tags: ["house"] }),
      baseVideo({ id: "b", tags: ["popping"] }),
    ];
    const results = filterVideosByTags(videos, "house hiphop", "or");
    expect(results.map((video) => video.id)).toEqual(["a"]);
  });
});

describe("sorting helpers", () => {
  it("sorts by updatedAt when present", () => {
    const videos = [
      baseVideo({ id: "a", updatedAt: 2000 }),
      baseVideo({ id: "b", updatedAt: 3000 }),
    ];
    expect(sortVideosByRecency(videos)[0].id).toBe("b");
  });

  it("falls back to createdAt when updatedAt is missing", () => {
    const videos = [
      baseVideo({ id: "a", createdAt: 2000 }),
      baseVideo({ id: "b", createdAt: 3000 }),
    ];
    expect(sortVideosByRecency(videos)[0].id).toBe("b");
  });
});
