import AsyncStorage from "@react-native-async-storage/async-storage";
import { addVideo, deleteVideo, getVideos, updateVideo } from "../storage";

const baseVideo = (overrides) => ({
  id: "id",
  sourceType: "local",
  uri: "file://video.mp4",
  tags: [],
  createdAt: 1000,
  ...overrides,
});

describe("storage helpers", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns empty list when storage is blank", async () => {
    await AsyncStorage.removeItem("DANCE_DECK_VIDEOS");
    const videos = await getVideos();
    expect(videos).toEqual([]);
  });

  it("adds videos and keeps the newest first", async () => {
    const first = baseVideo({ id: "a", createdAt: 1000 });
    const second = baseVideo({ id: "b", createdAt: 2000 });
    await addVideo(first);
    await addVideo(second);
    const videos = await getVideos();
    expect(videos[0].id).toBe("b");
  });

  it("updates a video with a fresh updatedAt timestamp", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(5000);
    const video = baseVideo({ id: "a" });
    await addVideo(video);
    await updateVideo({ ...video, title: "Updated" });
    const videos = await getVideos();
    expect(videos[0].updatedAt).toBe(5000);
    nowSpy.mockRestore();
  });

  it("deletes videos by id", async () => {
    const video = baseVideo({ id: "a" });
    await addVideo(video);
    await deleteVideo("a");
    const videos = await getVideos();
    expect(videos).toEqual([]);
  });
});
