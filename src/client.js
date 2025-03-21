document.addEventListener("DOMContentLoaded", () => {
  const uploadForm = document.getElementById("uploadForm");
  const videoListDiv = document.getElementById("videoListDiv");
  const viewVideosBtn = document.getElementById("viewVideosBtn");
  const fileInput = document.getElementById("videoInput");
  const dropZone = document.querySelector('label[for="videoInput"]');
  const fileText = document.getElementById("fileText");
  const messageArea = document.getElementById("messageArea");
  const successMessage = document.getElementById("successMessage");
  const errorMessage = document.getElementById("errorMessage");
  const videoLink = document.getElementById("videoLink");
  const successMessageText = document.getElementById("successMessageText");
  const titleInput = document.querySelector('input[name="title"]');
  const resetButton = document.getElementById("resetButton");

  // Drag and drop handlers
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("bg-greennight-lighter");
    dropZone.classList.remove("bg-greennight-light");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("bg-greennight-lighter");
    dropZone.classList.add("bg-greennight-light");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("bg-greennight-lighter");
    dropZone.classList.add("bg-greennight-light");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("video/")) {
        fileInput.files = files;
        fileText.textContent = file.name;
      } else {
        alert("Please drop a video file");
      }
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      fileText.textContent = e.target.files[0].name;
    } else {
      fileText.textContent = "Click to upload or drag and drop";
    }
  });

  resetButton.addEventListener("click", (e) => {
    fileInput.value = "";
    titleInput.value = "";
    fileText.textContent = "Click to upload or drag and drop";
  });

  loadVideos();

  document.querySelectorAll("#messageArea button").forEach((button) => {
    button.addEventListener("click", () => {
      messageArea.classList.add("hidden");
      successMessage.classList.add("hidden");
      errorMessage.classList.add("hidden");
    });
  });

  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append("video", fileInput.files[0]); // Explicitly add file
      formData.append("title", titleInput.value); // Explicitly add title

      // for (let [key, value] of formData.entries()) {
      //     console.log(`FormData entry: ${key}=${value}`);
      // }

      try {
        console.log("Submitting form with title:", titleInput.value);
        const response = await fetch("/upload", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        console.log("Upload response:", result);
        // ... rest of the success/error handling remains the same
        // ... rest of the code remains the same

        messageArea.classList.remove("hidden");
        if (result.success) {
          successMessage.classList.remove("hidden");
          errorMessage.classList.add("hidden");
          videoLink.href = result.videoUrl;
          videoLink.textContent = result.videoUrl;
          successMessageText.innerHTML = `Your url: <a id="videoLink" href="${result.videoUrl}" class="underline">${result.videoUrl}</a>`;
          fileInput.value = "";
          titleInput.value = ""; // Clear title input
          fileText.textContent = "Click to upload or drag and drop";
        } else {
          errorMessage.classList.remove("hidden");
          successMessage.classList.add("hidden");
          errorMessage.querySelector(".message-text").textContent =
            result.message || "Unknown error";
        }

        loadVideos();
      } catch (error) {
        console.error("Upload fetch error:", error);
        messageArea.classList.remove("hidden");
        errorMessage.classList.remove("hidden");
        successMessage.classList.add("hidden");
        errorMessage.querySelector(".message-text").textContent =
          error.message || "Network error";
      }
    });
  }

  async function loadVideos() {
    try {
      console.log("Fetching videos...");
      const response = await fetch("/videos");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${text}`);
      }
      const data = await response.json();
      // for debug only
      // console.log("Received videos:", data);

      if (data.success && Array.isArray(data.videos)) {
        if (data.videos.length > 0) {
          const videosHtml = data.videos
            .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
            .map((video) => {
              const ext = video.filename.split(".").pop().toLowerCase();
              const mimeTypes = {
                mp4: "video/mp4",
                webm: "video/webm",
                ogg: "video/ogg",
                mov: "video/quicktime",
                avi: "video/x-msvideo",
                mkv: "video/x-matroska",
                "3gp": "video/3gpp",
                flv: "video/x-flv",
              };
              const mimeType = mimeTypes[ext] || "video/mp4";

              return `
              <div class="bg-greennight-light p-4 rounded-lg flex flex-col justify-between h-full">
              <div>
                  <video controls class="rounded-lg max-h-[32rem]" preload="metadata">
                      <source src="${video.url}" type="${mimeType}">
                      Your browser does not support the video tag.
                  </video>
              </div>
              <div class="flex md:justify-between not-md:items-start not-md:flex-col items-center mt-4">
                  <div class="text-sm text-neutral-400 mt-2 text-left">
                      <span class="text-white text-2xl">${video.filename}</span>
                      <br>Uploaded: ${new Date(video.uploadDate).toLocaleString()}
                      <br>URL: <a href="${video.url}" target="_blank" class="text-blue-400">${video.url}</a>
                  </div>
                  <div class="h-full not-md:w-max not-md:mb-2"><button class="delete-btn h-full bg-main p-3 rounded-md not-md:mt-3 hover:bg-main-light transition-all duration-75 cursor-pointer" onclick="deleteVideo('${video.filename}')">Delete</button></div>
              </div>
          </div>
                            `;
            })
            .join("");
          videoListDiv.innerHTML = videosHtml;
        } else {
          videoListDiv.innerHTML = `
                        <div class="bg-greennight-light p-4 rounded-lg text-center text-neutral-400">
                            No videos uploaded yet.
                        </div>
                    `;
        }
      } else {
        throw new Error("Invalid response format from /videos endpoint");
      }
    } catch (error) {
      console.error("Error loading videos:", error);
      videoListDiv.innerHTML = `
                <div class="bg-red-600 p-4 rounded-lg text-center">
                    Error loading videos: ${error.message}
                </div>
            `;
    }
  }

  window.deleteVideo = async function (filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      const response = await fetch("/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${text}`);
      }
      const result = await response.json();
      if (result.success) {
        loadVideos();
        messageArea.classList.remove("hidden");
        successMessage.classList.remove("hidden");
        errorMessage.classList.add("hidden");
        successMessageText.textContent = `Deleted ${filename} successfully!`;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      messageArea.classList.remove("hidden");
      errorMessage.classList.remove("hidden");
      successMessage.classList.add("hidden");
      errorMessage.querySelector(
        ".message-text"
      ).textContent = `Error deleting ${filename}: ${error.message}`;
    }
  };

  if (viewVideosBtn) {
    viewVideosBtn.addEventListener("click", loadVideos);
  }

  const checkedRadio = document.querySelector('input[name="page"]:checked');
  if (checkedRadio) {
    const columns = checkedRadio.value;
    videoListDiv.classList.remove(
      "grid-cols-1",
      "grid-cols-2",
      "grid-cols-3",
      "grid-cols-4"
    );
    videoListDiv.classList.add(`grid-cols-${columns}`);
    updateVideoHeights(columns);
  }
});

const radioButtons = document.querySelectorAll('input[name="page"]');
radioButtons.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const columns = e.target.value;
    videoListDiv.classList.remove(
      "grid-cols-1",
      "grid-cols-2",
      "grid-cols-3",
      "grid-cols-4"
    );
    videoListDiv.classList.add(`grid-cols-${columns}`);
    updateVideoHeights(columns);
  });
});

function updateVideoHeights(columns) {
  const videos = document.querySelectorAll("video");
  videos.forEach((video) => {
    if (columns === "1") {
      video.classList.remove("max-h-[32rem]");
      video.classList.add("max-h-[64rem]");
    } else {
      video.classList.remove("max-h-[64rem]");
      video.classList.add("max-h-[32rem]");
    }
  });
}
