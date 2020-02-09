function initGetUserMedia() {
    // Older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
    }

    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function(constraints) {

            // First get ahold of the legacy getUserMedia, if present
            var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

            // Some browsers just don't implement it - return a rejected promise with an error
            // to keep a consistent interface
            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
            }

            // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
            return new Promise(function(resolve, reject) {
                getUserMedia(constraints, resolve, reject);
            });
        }
    }

}

class Meter {
    /**
     * @param {string} selector
     * @constructor
     */
    constructor(selector) {
        this.$root = document.querySelector(selector)
        this.$pointer = this.$root.querySelector('.meter-pointer')
        this.init()
    }

    init() {
        for (var i = 0; i <= 10; i += 1) {
            const $scale = document.createElement('div')
            $scale.className = 'meter-scale'
            $scale.style.transform = 'rotate(' + (i * 9 - 45) + 'deg)'
            if (i % 5 === 0) {
                $scale.classList.add('meter-scale-strong')
            }
            this.$root.appendChild($scale)
        }
    }

    /**
     * @param {number} deg
     */
    update(deg) {
        if (deg < -45) {
            deg = -45
        } else if (deg > 45) {
            deg = 45
        }
        this.$pointer.style.transform = 'rotate(' + parseInt(deg) + 'deg)'
    }

}

class Notes {
    constructor(selector) {
        this.isAutoMode = true
        this.allowPlay = true

        this.middleA = 440
        this.semitone = 69

        this.div = Math.pow(2, 1 / 12)

        this.$root = document.querySelector(selector)
        this.$notesList = this.$root.querySelector('.notes-list')
        this.$currentFrequency = this.$root.querySelector('.current-frequency')
        this.$standardFrequency = this.$root.querySelector('.standard-frequency')
        this.$notes = []
        this.$notesMap = {}
    }

    setNotes(notes) {
        this.$notesList.innerHTML = ""
        this.$notes = []
        this.$notesMap = {}
            // const minOctave = 0
            // const maxOctave = 0
            // for (var octave = minOctave; octave <= maxOctave; octave += 1) {}
        for (var n = 0; n < notes.length; n += 1) {
            const $note = document.createElement('div')
            $note.className = 'note'
            Object.assign($note.dataset, notes[n])
            $note.innerHTML =
                $note.dataset.name +
                '<span class="note-sharp">' +
                $note.dataset.upper +
                '</span>' +
                '<span class="note-octave">' +
                $note.dataset.lower +
                '</span>'
            this.$notesList.appendChild($note)
            this.$notes.push($note)
            this.$notesMap[$note.dataset.value] = $note
        }

        const self = this
        this.$notes.forEach(function($note) {
            $note.addEventListener('click', function() {
                // console.log('clicked', $note)
                if (self.isAutoMode) {
                    // return
                }
                const $active = self.$notesList.querySelector('.active')
                if ($active === this) {
                    self.stop()
                    $active.classList.remove('active')
                } else {
                    self.active(this)
                    if (self.allowPlay) {
                        self.play(this.dataset.frequency)
                        setTimeout(() => {
                            self.stop()
                            self.clearActive()
                        }, 2000)
                    }

                }

            })
        })
    }

    active($note) {
        this.clearActive()
        $note.classList.add('active')
        this.$notesList.scrollLeft = $note.offsetLeft - (this.$notesList.clientWidth - $note.clientWidth) / 2
        this.$standardFrequency.textContent = parseFloat($note.dataset.frequency).toFixed(2)
    }

    clearActive() {
        const $active = this.$notesList.querySelector('.active')
        if ($active) {
            $active.classList.remove('active')
        }
    }

    update(note) {
        if (note.value in this.$notesMap) {
            this.active(this.$notesMap[note.value])
            this.$currentFrequency.textContent = parseFloat(note.frequency).toFixed(2)
        }
    }

    toggleAutoMode() {
            if (this.isAutoMode) {
                this.clearActive()
            }
            this.isAutoMode = !this.isAutoMode
        }
        /**
         * get musical note from frequency
         *
         * @param {number} frequency
         * @returns {number}
         */
    getNote(frequency) {
        const offset = this.$notes.map(note => Math.abs(note.dataset.frequency - frequency))
        const id = offset.indexOf(Math.min(...offset))
            // console.log(offset, id, this.$notes[id])
        return this.$notes[id]
    }

    /**
     * get cents difference between given frequency and musical note's standard frequency
     *
     * @param {number} frequency
     * @param {number} note
     * @returns {number}
     */
    getCents(frequency, standard) {
        if (frequency < standard) {
            return (frequency / (standard / this.div) - 1) / (this.div - 1) - 1
        } else {
            return (frequency / standard - 1) / (this.div - 1)
        }
    }

    /**
     * play the musical note
     *
     * @param {number} frequency
     */
    play(frequency) {
        if (!this.audioContext) {
            return
        }
        if (!this.oscillator) {
            this.oscillator = this.audioContext.createOscillator()
            this.oscillator.connect(this.audioContext.destination)
            this.oscillator.start()
        }
        this.oscillator.frequency.value = frequency
    }

    stop() {
        this.oscillator && this.oscillator.stop()
        this.oscillator = null
    }
}

class FrequencyBars {
    /**
     * the frequency histogram
     *
     * @param {string} selector
     * @constructor
     */
    constructor(selector, max_length = 2048 / 24) {
        this.max_length = max_length
        this.$canvas = document.querySelector(selector)
        this.$canvas.width = document.body.clientWidth
        this.$canvas.height = document.body.clientHeight / 2
        this.canvasContext = this.$canvas.getContext('2d')
        this.factor = this.$canvas.height / 200
            // alert(this.factor)
    }

    /**
     * @param {Uint8Array} data
     */
    update(data) {
        // console.log(data.length)
        const length = Math.min(data.length, this.max_length) // low frequency only
        const width = this.$canvas.width / length - 0.5
        this.canvasContext.clearRect(0, 0, this.$canvas.width, this.$canvas.height)
        for (var i = 0; i < length; i += 1) {
            // this.canvasContext.fillStyle = '#ecf0f1'
            // this.canvasContext.fillStyle = '#878588 '
            this.canvasContext.fillStyle = 'hsl(' + (i * 360 / length) + ', 100%, 50%)'

            this.canvasContext.fillRect(
                i * (width + 0.5),
                this.$canvas.height - data[i] * this.factor,
                width,
                data[i] * this.factor
            )
        }
    }

}

class Tuner {
    constructor() {

    }
}

class Application {
    constructor() {
        this.notes = new Notes('.notes')
        this.meter = new Meter('.meter')
        this.frequencyBars = new FrequencyBars('.frequency-bars')


        // console.log(this.notes.getCents(115, 110 * this.notes.div))
        // console.log(this.notes.getCents(105, 110 / this.notes.div))
        // setTimeout(() => {
        //     this.notes.setNotes([notes[1], notes[3], notes[5]])
        // }, 5000);
    }

    start() {
        const self = this
        const audioContext = new(window.AudioContext || window.webkitAudioContext)()
        this.notes.audioContext = audioContext
        initGetUserMedia()
        const bufferSize = 4096
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {

            audioContext.createMediaStreamSource(stream).connect(scriptProcessor)
            scriptProcessor.connect(audioContext.destination)
            Aubio().then(function(aubio) {
                // alert(aubio)
                const fft = new aubio.FFT(2048)
                const pitchDetector = new aubio.Pitch(
                    'default', scriptProcessor.bufferSize, 1, audioContext.sampleRate)
                scriptProcessor.addEventListener('audioprocess', function(event) {

                    // frequencyData
                    const spectrum = fft.forward(event.inputBuffer.getChannelData(0))
                    self.frequencyData = spectrum.norm
                    var max_value = Math.max(...self.frequencyData)
                        // console.log(max_value)
                    self.frequencyBars.update(self.frequencyData)
                        // PitchDetect
                    const frequency = pitchDetector.do(event.inputBuffer.getChannelData(0))
                    if (frequency && self.onNoteDetected) {
                        console.log(frequency, max_value)
                        if (max_value < 5) {
                            // return
                        }
                        const note = self.notes.getNote(frequency)
                        self.onNoteDetected({
                            name: note.dataset.name,
                            value: note.dataset.value,
                            cents: self.notes.getCents(frequency, note.dataset.frequency),
                            // octave: parseInt(note),
                            frequency: frequency
                        })
                    }
                })

                // this.updateFrequencyBars()

            })

        }).catch(function(err) {
            console.log(err)
            alert(err.message)
        })

        this.onNoteDetected = (note) => {
            if (self.notes.isAutoMode) {
                if (self.lastNote === note.name) {
                    self.update(note)
                } else {
                    self.lastNote = note.name
                }
            }
        }

    }

    update(note) {
        this.notes.update(note)
        this.meter.update(note.cents * 45)
    }

    // noinspection JSUnusedGlobalSymbols
    toggleAutoMode() {
        this.notes.toggleAutoMode()
    }
}