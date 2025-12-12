// reindeer present hell rhythym game
//
// midi parser parses a song (slow -> fast as game progresses)
// sections send reindeer or presents
// either a clothesline of hanging presents or a sleigh with empty reindeer slots flies
// across the top of the screen.
//
// reindeer mode: reindeer are shot from the gun and fly toward the current note
// which shines briefly
// the goal is to fling reindeer into empty positions in the sleigh.  you get points for
// making the reindeer complement of the sleigh more complete.
//
// present mode: elves are shot from the cannon and knock the presents into a passing
// sleigh train.  precision isn't needed, score is only the amount of presents knocked in.
class Empty {
  render() { }
  update() { }
  die() { }
}

function canvasRenderPositionOrientation(game, renderable) {
  const ctx = game.getContext();
  const img = game.getImage(renderable.image);
  const w = img.width;
  const h = img.height;
  ctx.save();
  ctx.translate(renderable.x, renderable.y);
  ctx.rotate(renderable.r / (180.0 / Math.PI));
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}

class Spinner {
  constructor(xm, ym, spin, gravity) {
    this.spin = spin;
    this.xm = xm;
    this.ym = ym;
    this.spin = spin;
    this.gravity = gravity;
  }

  update(game, object, idx, interval) {
    object.r += (interval / 1000.0 * this.spin) * (180 / Math.PI);
    object.x += this.xm;
    object.y += this.ym;
    this.ym += this.gravity;
    if (object.y > 400) {
      object.die(game, idx);
    }
  }
}

class Reindeer {
  constructor(image, x, y, r, updater) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.r = r;
    this.state = 'new';
    this.updater = updater;
  }

  render(game) {
    canvasRenderPositionOrientation(game, this);
  }

  update(game, idx, interval) {
    this.updater.update(game, this, idx, interval);
  }

  die(game, idx) {
    game.kill(idx);
  }

  caught() {
    this.state = 'caught';
  }

  released() {
    this.state = 'released';
  }

  setUpdater(updater) {
    this.updater = updater;
  }
};

class NoteUpdater {
  constructor(msPerDelta, track, note, color, x, y) {
    this.msPerDelta = msPerDelta;
    this.noteTime = 0;
    this.note = note;
    this.activation = 0;
    this.time = 0;
    this.velocity = 0;
    this.target = 0;
    this.pointer = 0;
    this.track = track;
    this.shootReindeer = false;
    this.color = color;
    this.x = x;
    this.y = y;
    console.log('msPerDelta', this.msPerDelta);
  }

  render(game) {
    const ctx = game.getContext();
    ctx.fillStyle = this.color;
    game.drawCircle({ x: this.x, y: this.y, r: 10 * this.activation });
  }

  update(game, idx, interval) {
    let updated = false;

    this.shootReindeer = false;
    this.time += interval;
    while (this.pointer < this.track.event.length && this.noteTime + this.track.event[this.pointer].deltaTime * this.msPerDelta < this.time) {
      this.pointer += 1;
      updated = true;
      this.noteTime = this.time;
    }

    if (this.pointer >= this.track.event.length) {
      this.target = 0;
      this.velocity = 0;
    } else if (updated) {
      const event = this.track.event[this.pointer];
      if (event.type === 9 && event.data[0] === this.note) {
        this.velocity = event.data[1];
        this.target = 1;
        this.shootReindeer = true;
      } else if (event.type === 8 && event.data[0] === this.note) {
        this.velocity = event.data[1];
        this.target = 0;
      }
    }

    const velocityIncrement = 3.0 * (interval / 1000.0) * (255.0 / (1 + this.velocity));
    if (this.activation > this.target) {
      this.activation = Math.max(this.activation - velocityIncrement, this.target);
    } else if (this.activation < this.target) {
      this.activation = Math.min(this.activation + velocityIncrement, this.target);
    }
  }

  die(game, idx) { }
};

class Cannon {
  constructor(image, notes, x, y) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.r = 0;
    this.rTarget = 0;
    this.notes = notes;
  }

  render(game) {
    canvasRenderPositionOrientation(game, this);
  }

  update(game, idx, interval) {
    for (let i = 0; i < this.notes.length; i++) {
      if (this.notes[i].shootReindeer) {
        this.rTarget = i * -8;
        const noteTargetX = this.notes[i].x;
        const noteTargetY = this.notes[i].y;
        const targetMomentumX = (noteTargetX - this.x) * 0.01;
        const targetMomentumY = ((noteTargetY - this.y) - ((7 - i) * 20)) * 0.01;
        const reindeerSpinner = new Spinner(targetMomentumX, targetMomentumY, 1.0, 0.02);
        game.newObject(new Reindeer('reindeer.png', this.x, this.y, 270 * Math.random(), reindeerSpinner));
      }
    }
    if (this.r > this.rTarget) {
      this.r -= 0.1 * interval;
    } else if (this.r < this.rTarget) {
      this.r += 0.1 * interval;
    }
  }

  die(game, idx) { }
}

function distSqr(o1, o2) {
  const xd = o2.x - o1.x;
  const yd = o2.y - o1.y;
  return (xd * xd) + (yd * yd);
}

class Present {
  constructor(image, x, y, updater) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.r = 0;
    this.updater = updater;
  }

  render(game) {
    canvasRenderPositionOrientation(game, this);
  }

  update(game, idx, interval) {
    const dist = 30;
    this.updater.update(game, this, idx, interval);

    if (this.y > 50) {
      this.die(game, idx);
      return;
    }

    const reindeer = game.getObjects((r) => r.image == 'reindeer.png');
    for (let o of reindeer) {
      const rd = distSqr(this, o.obj);
      if (rd <= (dist * dist)) {
        this.updater = new Spinner(0, -0.2, 0.3, 0.2);
        return;
      }
    }
  }

  die(game, idx) {
    game.kill(idx);
  }
}

class PresentSpawner {
  constructor(image, x, y, presents, startPresent, presentInterval) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.presents = presents;
    this.presentTime = startPresent;
    this.presentInterval = presentInterval;
  }

  render(game) {
  }

  update(game, idx, interval) {
    this.presentTime -= interval;
    if (this.presentTime < 0) {
      this.presentTime = this.presentInterval;
      if (this.presents > 0) {
        this.presents--;
        game.newObject(new Present(this.image, this.x, this.y, new Spinner(-2, 0, 0, 0)));
      }
    }
  }

  die(game, idx) {
  }
}

class Seesaw {
  constructor(image, canvas, x, y) {
    this.x = x;
    this.y = y;
    this.r = 15;
    this.image = image;
    this.canvas = canvas;
    this.scale = 3.0;
    this.leftReindeer = null;
    this.rightReindeer = null;
    this.watchMouse = (evt) => {
      if (!evt.target && !evt.clientX) {
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const actualWidth = rect.width;
      const mid = actualWidth / 2;
      const midOffset = evt.clientX - mid;
      const pixelWidth = canvas.width;
      const pixelMid = pixelWidth / 2;
      this.x = pixelMid + ((evt.clientX - mid) * this.scale) * (pixelWidth / actualWidth);
    };
    canvas.addEventListener('mousemove', this.watchMouse);
  }

  render(game) {
    canvasRenderPositionOrientation(game, this);
  }

  update(game, idx, interval) {
    const width = 60;
    const height = 40;
    const upMax = 7;

    const reindeer = game.getObjects((r) => r.image == 'reindeer.png');
    for (let o of reindeer) {
      if (o.obj.y < this.y - height || o.obj.y > this.y + height) {
        continue;
      }
      if (o.obj.x < this.x - width || o.obj.x > this.x + width) {
        continue;
      }
      if (o.obj.state !== 'new') {
        continue;
      }

      const xoff = o.obj.x - this.x;
      o.obj.setUpdater({
        update: (game, reindeer, idx, interval) => {
          reindeer.x = this.x + xoff;
          reindeer.y = this.y;
        }
      });

      let thisReindeer, altReindeer;
      let setReindeerSlot, setAltSlot;

      if (o.obj.x < this.x) {
        thisReindeer = this.rightReindeer;
        altReindeer = this.leftReindeer;
        setReindeerSlot = (r) => this.rightReindeer = r;
        setAltSlot = (r) => this.leftReindeer = r;
        this.r = -15;
      } else {
        thisReindeer = this.leftReindeer;
        altReindeer = this.rightReindeer;
        setReindeerSlot = (r) => this.leftReindeer = r;
        setAltSlot = (r) => this.rightReindeer = r;
        this.r = 15;
      }

      if (altReindeer) {
        const upForce = -upMax * ((Math.abs(o.obj.x - this.x) + Math.abs(altReindeer.x - this.x)) / width);
        console.log(upForce);
        altReindeer.setUpdater(new Spinner(0, upForce, 4, 0.02));
        altReindeer.released();
        setAltSlot(null);
      }
      if (thisReindeer) {
        thisReindeer.setUpdater(new Spinner(0, -0.2, 6, 0.02));
      }
      o.obj.caught();
      setReindeerSlot(o.obj);
      return;
    }
  }

  die(game, idx) {
    this.canvas.removeEventListener('mousemove', this.watchMouse);
  }
}

class ReindeerGame {
  constructor(canvas, hidden) {
    this.canvas = canvas;
    this.hidden = hidden;
    this.killList = {};
    this.freeList = [];
    this.ctx = canvas.getContext('2d');
    this.loadedImages = 0;
    this.images = {
      "reindeer.png": null,
      "plank.png": null,
      "present.png": null,
      "cannon.png": null
    };
    this.expectedImages = Object.keys(this.images).length;
    this.objects = [];
    this.time = 0;
    this.midi = { track: [] };
    this.score = 0;
    this.paused = false;
    this.maxPresents = 80;
    this.renderFunc = () => this.showLoading();
    this.presentSpawner = new PresentSpawner('present.png', 650, 40, this.maxPresents, 1200, 500);
    let imagekeys = Object.keys(this.images);
    Promise.all(imagekeys.map((i) => {
      return this.loadImage(i);
    })).then(() => {
      this.renderFunc = () => this.clickToStart();
    });
    this.pauseListener = (evt) => {
      this.paused = !this.paused;
      this.midiElement.dispatchEvent(new Event('click'));
    };
    this.clickListener = (evt) => {
      this.midi = this.loadMidi(ode_to_joy);
      this.msPerTick = 1.0;
      this.timeSignatureDenominator = 2;
      this.metronomeTicks = 24;
      this.notesPerBeat = 8;
      this.microsecondsPerQuarter = 0x0927c0;
      for (let i = 0; i < this.midi.track[0].event.length; i++) {
        const event = this.midi.track[0].event[i];
        console.log(event);
        if (event.metaType == 0x51) {
          this.microsecondsPerQuarter = event.data;
        }
        if (event.metaType == 0x58) {
          this.timeSignatureDenominator = event.data[1];
          this.metronomeTicks = event.data[2];
          this.notesPerBeat = event.data[3];
        }
      }
      this.microsecondsPerMinute = 60 * 1000 * 1000;
      this.tempo = this.microsecondsPerMinute / this.microsecondsPerQuarter;
      this.bpm = this.microsecondsPerMinute / this.tempo;
      this.divisions = this.notesPerBeat;
      this.ticksPerMinute = this.bpm * this.divisions;
      this.tickDuration = 60 / this.ticksPerMinute;
      this.msPerTick = 100000.0 * this.tickDuration;

      const noteUpdaters = [];
      const notes = [46, 50, 54, 58, 62, 66, 70, 74, 78];
      const colors = ["#e6261f", "#eb7532", "#f7d038", "#a3e048", "#49da9a", "#34bbe6", "#4355db", "#d23be7"];
      for (let i = 0; i < notes.length; i++) {
        console.log('midi track', this.midi.track[1]);
        const note = new NoteUpdater(this.msPerTick, this.midi.track[1], notes[i], colors[i], 50 + 75 * i, 320);
        noteUpdaters.push(note);
        this.newObject(note);
      }

      const reindeerSpinner = new Spinner(-0.1, 1.0, 1.0, 0.02);
      this.newObject(new Reindeer('reindeer.png', 400, 30, 5, reindeerSpinner));
      this.newObject(new Cannon('cannon.png', noteUpdaters, 600, 100));
      this.newObject(new Seesaw('plank.png', this.canvas, 600, 320));
      this.newObject(this.presentSpawner);

      this.time = (new Date().getTime());
      this.renderFunc = () => this.render();
      this.canvas.removeEventListener('click', this.clickListener);
      this.midiElement = document.createElement("midi-player");
      this.midiElement.setAttribute('src', 'data:audio/midi;base64,' + ode_to_joy);
      this.midiElement.addEventListener('load', () => {
        this.midiElement.dispatchEvent(new Event('click'));
      });
      this.hidden.appendChild(this.midiElement);
      this.canvas.addEventListener('click', this.pauseListener);
    };
    this.canvas.addEventListener('click', this.clickListener);
  }

  loadMidi(midiData) {
    return MidiParser.parse(midiData);
  }

  getContext() { return this.ctx; }
  getImage(img) { return this.images[img]; }

  getObjects(pred) {
    return this.objects.flatMap((o, i) => {
      if (pred(o)) { return [ { idx: i, obj: o } ]; }
      return [];
    });
  }

  newObject(object) {
    if (this.freeList.length > 0) {
      const newObjectId = this.freeList.shift();
      console.log('new from freelist', newObjectId);
      this.objects[newObjectId] = object;
      return;
    }
    this.objects.push(object);
  }

  drawCircle(circle) {
    this.ctx.beginPath();
    this.ctx.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  clear() {
    const g = this.ctx.createLinearGradient(0, 0, 15, this.canvas.height);
    g.addColorStop(0, '#4d4359');
    g.addColorStop(1, '#6c4b94');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawScore() {
    this.ctx.fillStyle = '#fff';
    this.drawCircle({ x: 50, y: 50, r: 23 });
    this.ctx.fillStyle = '#f33';
    this.ctx.beginPath();
    this.ctx.moveTo(50, 50);
    this.ctx.lineTo(50 + 18, 50);
    this.ctx.arc(50, 50, 18, 0, 2 * Math.PI * (this.score / this.maxPresents));
    this.ctx.lineTo(50, 50);
    this.ctx.fill();
  }

  loadImage(i) {
    const imageElement = document.createElement('img');
    imageElement.setAttribute('src', i);
    const p = new Promise((resolve, reject) => {
      imageElement.addEventListener('load', () => {
        this.images[i] = imageElement;
        this.loadedImages++;
        resolve();
      });
    });
    this.hidden.appendChild(imageElement);
    return p;
  }

  render() {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      this.objects[i].render(this);
    }
  }

  showText(loadingMsg) {
    this.ctx.font = "48px serif";
    this.ctx.fillStyle = '#fff';
    const measured = this.ctx.measureText(loadingMsg);
    const x = (this.canvas.width - measured.width) / 2;
    const y = this.canvas.height / 2;
    this.ctx.fillText(loadingMsg, x, y);
  }

  showLoading() {
    this.showText(`Loading ${this.loadedImages+1}/${this.expectedImages}`);
  }

  showPaused() {
    this.showText('Paused');
  }

  clickToStart() {
    this.showText('Click to Start!');
  }

  kill(idx) {
    if (this.objects[idx].image && this.objects[idx].image === 'present.png') {
      this.score += 1;
    }
    this.objects[idx] = new Empty();
    this.freeList.push(idx);
  }

  rerender() {
    const now = new Date().getTime();
    if (this.paused) {
      this.time = now;
      this.showPaused();
    } else {
      const interval = now - this.time;
      this.time = now;
      this.objects.forEach((o, i) => o.update(this, i, interval));
      this.clear();
      this.renderFunc();
      this.drawScore();
    }
    window.requestAnimationFrame(() => this.rerender());
  }
};

const canvas = document.getElementById('dwg');
const hidden = document.getElementById('hidden');
const r = new ReindeerGame(canvas, hidden);
r.rerender();
