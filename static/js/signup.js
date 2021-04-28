const errorMap = {
    'NotAllowedError': 'Camera banned, please turn on your camera!',
    'AbortError': 'Unknown Error',
    'NotFoundError': 'Camera Not Found!',
    'NotReadableError': 'Unknown Error',
    'OverConstrainedError': 'Camera Not Found!',
    'SecurityError': 'Camera banned, please turn on your camera!',
    'TypeError': 'Unknown Error'
};

class FaceDetection {
    constructor(options) {
        this.options = Object.assign({
            matchedScore: 0.9,
            mediaSize: {
                width: 600,
                height: 400,
                left: 200,
                top: 200
            }
        }, options);

        this.timer = null;

        this.videoEl = document.querySelector('#videoEl');
        this.trackBoxEl = document.querySelector('#trackBox');
        this.canvasImgEl = document.querySelector('#canvasImg');
        this.operationEl = document.querySelector('.operation');
        this.retryBtnEl = document.querySelector('#js-retry');
        this.compareBtnEl = document.querySelector('#js-compare');
        this.init();
    }

    init() {
        this.resize();
        this.initDetection();
        this.bindEvents();
    }


    resize() {
        const tmp = [this.videoEl];
        for (let i = 0; i < tmp.length; i++) {
            tmp[i].width = this.options.mediaSize.width;
            tmp[i].height = this.options.mediaSize.height;
        }
        const wraperEl = document.querySelector('.wraper');
        wraperEl.style.width = `${this.options.mediaSize.width}px`;
        wraperEl.style.height = `${this.options.mediaSize.height}px`;
        wraperEl.style.left = `${this.options.mediaSize.left}px`;
        wraperEl.style.top = `${this.options.mediaSize.top}px`;
    }

    async initDetection() {
        faceapi.loadTinyFaceDetectorModel('static/js/models');
        const mediaOpt = {
            video: true
        };
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            this.mediaStreamTrack = await navigator.mediaDevices.getUserMedia(mediaOpt)
                .catch(this.mediaErrorCallback);
        } else if (navigator.webkitGetUserMedia) {
            this.mediaStreamTrack = await navigator.webkitGetUserMedia(mediaOpt)
                .catch(this.mediaErrorCallback);
        } else if (navigator.mozGetUserMedia) {
            this.mediaStreamTrack = await navigator.mozGetUserMedia(mediaOpt)
                .catch(this.mediaErrorCallback);
        } else if (navigator.getUserMedia) {
            this.mediaStreamTrack = await navigator.getUserMedia(mediaOpt)
                .catch(this.mediaErrorCallback);
        }
        this.initVideo();
    }

    bindEvents() {
        this.showEl(this.retryBtnEl)
        this.showEl(this.compareBtnEl)
        this.retryBtnEl.onclick = () => {
            if (this.videoEl.paused || this.videoEl.ended) {

                this.videoEl.play();
            }
        };

        this.compareBtnEl.onclick = () => {
            this.canvasImgEl.getContext('2d').drawImage(this.videoEl, 0, 0, this.canvasImgEl.width, this.canvasImgEl.height);
            let image = this.canvasImgEl.toDataURL('image/png');
            var form = $("#signup");
            var url = form.attr('action');
            var formData = new FormData(form[0]);
            formData.append("photo", image)
            $.ajax({
                type: "POST",
                url: url,
                data: formData,
                contentType: false,
                processData: false,
                success: function (data) {
                    alert(data.message);
                    window.location = "/login"
                },
                error:function(XMLHttpRequest, textStatus, errorThrown){
                    alert(XMLHttpRequest.responseText)
                }
            })
        };
    }

    initVideo(stream) {
        this.videoEl.onplay = () => {
            this.onPlay();
        };
        this.videoEl.srcObject = this.mediaStreamTrack;
        setTimeout(() => this.onPlay(), 300);
    }

    mediaErrorCallback(error) {
        if (errorMap[error.name]) {
            alert(errorMap[error.name]);
        }
    }

    async onPlay() {
        if (this.videoEl && (this.videoEl.paused || this.videoEl.ended)) {
            this.timer = setTimeout(() => this.onPlay());
            return;
        }
        const faceDetectionTask = await faceapi.detectSingleFace(this.videoEl, new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.6
        }));

        if (faceDetectionTask) {
            this.drawFaceBox(this.videoEl, this.trackBoxEl, [faceDetectionTask], faceDetectionTask.score)
            if (faceDetectionTask.score > this.options.matchedScore) {
                this.videoEl.pause();
                return;
            }
        }
        this.timer = setTimeout(() => this.onPlay());
    }

    drawFaceBox(dimensions, trackBox, detections, score) {
        this.showEl(trackBox);

        trackBox.width = this.options.mediaSize.width;
        trackBox.height = this.options.mediaSize.height;

        const resizedDetections = detections.map(res => res.forSize(trackBox.width, trackBox.height));


        const faceBoxOpts = score > this.options.matchedScore ? {
            lineWidth: 2,
            textColor: 'green',
            boxColor: 'green',
            withScore: true
        } : {
            lineWidth: 2,
            textColor: 'red',
            boxColor: 'red',
            withScore: true
        };

        faceapi.drawDetection(trackBox, resizedDetections, faceBoxOpts);
    }

    showEl(el) {
        el.style.visibility = 'visible';
        return this;
    }

    hideEl(el) {
        el.style.visibility = 'hidden';
        return this;
    }

}


$("#signup").submit(function (e) {
    e.preventDefault();
    new FaceDetection();
});


