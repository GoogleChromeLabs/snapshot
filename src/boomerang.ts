export default class Boomerang {
  ready: Promise<void>;

  private video: HTMLVideoElement;
  private animationFrame = 0;
  private last = 0;
  private direction = 1;
  private position = 0;

  constructor(video: HTMLVideoElement) {
    this.video = video;

    this.ready = new Promise((resolve, reject) => {
      this.video.addEventListener('loadedmetadata', () => resolve());
      this.video.addEventListener('error', reject);
    });
  }

  async start() {
    await this.ready;
    this.video.play();
    this.last = performance.now() / 1000;
    this.update();
  }

  update() {
    this.animationFrame = requestAnimationFrame(() => this.update());

    if (this.video.seeking) {
      // The video still hasn't seeked to the correct position for the last
      // frame. We are going to have to drop a frame to allow the video to catch
      // up.
      return;
    }
    const current = performance.now() / 1000;
    const elapsed = current - this.last;
    this.last = current;

    this.position += elapsed * this.direction;

    // NOTE: For videos produced by Chrome MediaRecorder, the video.duration is
    // initially Infinity. Only when the video playback reaches the end of the
    // video for the first time does the browser work out how long the video is
    // and set the duration. Trying to do arithmetic with the duration can give
    // you results that are NaN, and storing the initial value and then using it
    // in a loop condition can give you an infinite loop.

    // Check if we are out of bounds and if so, reverse direction.
    if (this.position > this.video.duration) {
      const overshoot = this.position - this.video.duration;
      this.position = this.video.duration - overshoot;
      this.direction = -1;
    } else if (this.position < 0) {
      this.position *= -1;
      this.direction = 1;
    }

    // Seek the video to the new position
    const newTime = Math.round(this.position * 30) / 30;
    if (this.video.currentTime !== newTime) {
      this.video.currentTime = newTime;
    }
  }

  stop() {
    this.video.pause();
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }
}
