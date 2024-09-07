let progressBar = document.getElementById("progress");
let ctrlIcon = document.getElementById("ctrlIcon");
let thumbnail = document.querySelector(".song-thumbnail");
let barsIcon = document.getElementById("barsIcon");
let searchIcon = document.getElementById("searchIcon");
let notificationIcon = document.getElementById("notificationIcon");




function showContainer2() {
  document.getElementById('container-1').classList.add('hidden');
  document.getElementById('container-2').classList.remove('hidden');
}



let songArray = [];

const animatedImg = document.getElementById('animatedImg');


// Set max value of progress bar to song duration when metadata is loaded
barsIcon.addEventListener("click", (e) => {
  e.preventDefault();
  let toggleBox = document.querySelector(".bars-toggle-wrap");

  if (toggleBox.style.display === "none" || toggleBox.style.display === "") {
    toggleBox.style.display = "flex";
  } else {
    toggleBox.style.display = "none";
  }

  e.stopPropagation();
});

document.addEventListener("click", (e) => {
  let toggleBox = document.querySelector(".bars-toggle-wrap");

  // Check if the click is outside the toggleBox
  if (toggleBox.style.display === "flex" && !toggleBox.contains(e.target) && e.target !== barsIcon) {
    toggleBox.style.display = "none";
  }
});



searchIcon.addEventListener("click", (e) => {
  e.preventDefault();
  let searcBox = document.querySelector("#search-bar");

  if (searcBox.style.display === "none" || searcBox.style.display === "") {
    searcBox.style.display = "flex";
  } else {
    searcBox.style.display = "none";
  }
  e.stopPropagation();
});

document.addEventListener("click", (e) => {
  let searcBox = document.querySelector("#search-bar");

  // Check if the click is outside the toggleBox
  if (searcBox.style.display === "flex" && !searcBox.contains(e.target) && e.target !== searchIcon) {
    searcBox.style.display = "none";
  }
});

notificationIcon.addEventListener("click", (e) => {
  e.preventDefault();
  let notificationBox = document.querySelector(".notification-box");

  if (
    notificationBox.style.display === "none" ||
    notificationBox.style.display === ""
  ) {
    notificationBox.style.display = "flex";
  } else {
    notificationBox.style.display = "none";
  }

  e.stopPropagation();
});

document.addEventListener("click", (e) => {
  let notificationBox = document.querySelector(".notification-box");

  // Check if the click is outside the toggleBox
  if (notificationBox.style.display === "flex" && !notificationBox.contains(e.target) && e.target !== notificationIcon) {
    notificationBox.style.display = "none";
  }
});




// Extracting file metadata e.g. song name, artist image, duration etc...

document.getElementById('audio-upload').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
      console.log('File selected:', file.name);
      jsmediatags.read(file, {
          onSuccess: function(tag) {
              const metadata = {
                  name: tag.tags.title || file.name, 
                  artist: tag.tags.artist || 'Unknown Artist',
                  album: tag.tags.album || 'Unknown Album',
                  duration: 0, 
              };

              if (tag.tags.picture) {
                  const picture = tag.tags.picture;
                  const base64String = arrayBufferToBase64(picture.data);
                  metadata.image = `data:${picture.format};base64,${base64String}`;
              } else {
                  metadata.image = ''; 
              }

              const reader = new FileReader();
              reader.onload = function(e) {
                  const arrayBuffer = e.target.result; 

                  const audio = new Audio(URL.createObjectURL(file));
                  audio.addEventListener('loadedmetadata', function() {
                      metadata.duration = audio.duration;

                      storeSongInDB(arrayBuffer, metadata);
                  });
              };
              reader.readAsArrayBuffer(file); 
          },
          onError: function(error) {
              console.error('Error reading metadata:', error);
          }
      });
  }
});

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}



let db; 

const request = indexedDB.open('MusicPlayerDB', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains('songs')) {
        const objectStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });

        objectStore.createIndex('name', 'name', { unique: false });
        objectStore.createIndex('album', 'album', { unique: false });
        objectStore.createIndex('artist', 'artist', { unique: false });
        objectStore.createIndex('image', 'image', { unique: false });
        objectStore.createIndex('file', 'file', { unique: false });
    }
    console.log('Database setup complete');
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log('Database opened successfully');
};

request.onerror = function(event) {
    console.error('Database error:', event.target.errorCode);
};


function storeSongInDB(arrayBuffer, metadata) {

  if (db) {
      const transaction = db.transaction(['songs'], 'readwrite');
      const objectStore = transaction.objectStore('songs');

      // Create a blob from the ArrayBuffer
      const songBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });

      const songData = {
          name: metadata.name,
          artist: metadata.artist,
          album: metadata.album,
          image: metadata.image,
          file: songBlob
      };

      const addRequest = objectStore.add(songData);

      addRequest.onsuccess = function() {
          console.log('Song data stored successfully!');
          displayStoredSongs();
      };

      addRequest.onerror = function(event) {
          console.error('Error storing song data:', event.target.errorCode);
      };
  } else {
      console.error('Database is not initialized.');
  }
}



function displayStoredSongs() {
  const dbRequest = indexedDB.open('MusicPlayerDB', 1);

  dbRequest.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['songs'], 'readonly');
      const objectStore = transaction.objectStore('songs');

      const getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = function(event) {
          const songs = event.target.result;

          // Create an array to store all songs
          const songArray = songs.map(song => ({
              name: song.name,
              artist: song.artist,
              album: song.album,
              image: song.image || 'images/default-img.jfif',
              file: song.file
          }));
          currentPlayingSong(songArray);
      };

      getAllRequest.onerror = function(event) {
          console.error('Error retrieving songs:', event.target.errorCode);
      };
  };

  dbRequest.onerror = function(event) {
      console.error('Error opening database:', event.target.errorCode);
  };
}


let currentlyPlayingSong = null; 
let currentIndex = null;

// Function to populate the song list
function currentPlayingSong(songDataArray) {
  songArray = songDataArray;
  if (songArray.length === 0) {
    animatedImg.style.display = 'flex'; // Show image if no songs
  }else{

    const songList = document.querySelector('.song-list ul');
    songList.innerHTML = ''; 
  
    songArray.forEach((song, index) => {
      const li = document.createElement('li');
  
      const imgElement = document.createElement('img');
      imgElement.src = song.image || 'images/default-img.png';
      imgElement.alt = song.name || 'default-img';
      imgElement.classList.add('songImage'); 
  
      const pElementForSongName = document.createElement('p');
      pElementForSongName.textContent = song.name;
      pElementForSongName.classList.add('songName'); 
  
      const pElementForSongArtist = document.createElement('p');
      pElementForSongArtist.textContent = song.artist;
      pElementForSongArtist.classList.add('songArtist'); 
  
      const pElementForSongAlbum = document.createElement('p');
      pElementForSongAlbum.textContent = song.album;
      pElementForSongAlbum.classList.add('songAlbum');
  
      li.appendChild(imgElement);
      li.appendChild(pElementForSongName);
      li.appendChild(pElementForSongArtist);
      li.appendChild(pElementForSongAlbum);
      
      li.onclick = () => handleSongClick(index);
  
      songList.appendChild(li);

    });

    animatedImg.style.display = 'none';

  }
  
 
}

// Function to handle song click
function handleSongClick(index) {
  if (songArray && index >= 0 && index < songArray.length) {
      if (currentlyPlayingSong) {
          currentlyPlayingSong.pause();
      }

      const song = songArray[index];
      const audio = new Audio(URL.createObjectURL(song.file));
      audio.play();

      currentlyPlayingSong = audio;
      currentIndex = index;

      ctrlIcon.classList.remove("fa-play");
      ctrlIcon.classList.add("fa-pause");
      thumbnail.style.animationPlayState = "running";

      // Hide container-2 and show container-1
      document.getElementById('container-1').classList.remove('hidden');
      document.getElementById('container-2').classList.add('hidden');

      audio.onloadedmetadata = function () {
          progressBar.max = audio.duration;
      };

      // Updating UI
      const songThumbnail = document.getElementById('song-thumbnail');
      const songName = document.getElementById('songName');
      const artistNanme = document.getElementById('artistNanme');
      const songAlbum = document.getElementById('songAlbum');

      songThumbnail.src = song.image;
      songName.innerText = song.name;
      artistNanme.innerText = song.artist;
      songAlbum.innerText = song.album;

      songCurrentTime();

      function songCurrentTime() {
          let songTime = document.getElementsByClassName("song-timer")[0];

          setInterval(() => {
              if (currentlyPlayingSong && songTime && songTime.children[0]) {
                  let currentTime = Math.floor(currentlyPlayingSong.currentTime);
                  let minutes = Math.floor(currentTime / 60);
                  let seconds = currentTime % 60;

                  let formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
                  songTime.children[0].innerText = formattedTime;
              }
          }, 100);

          currentlyPlayingSong.addEventListener("loadedmetadata", () => {
              if (songTime && songTime.children[1]) {
                  let duration = Math.floor(currentlyPlayingSong.duration);
                  let minutes = Math.floor(duration / 60);
                  let seconds = duration % 60;

                  let formattedDuration = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
                  songTime.children[1].innerText = formattedDuration;
              }
          });
      }

      currentlyPlayingSong.ontimeupdate = function () {
          progressBar.value = currentlyPlayingSong.currentTime;
      };

      progressBar.oninput = function () {
          currentlyPlayingSong.currentTime = progressBar.value;
          if (currentlyPlayingSong.paused) {
              currentlyPlayingSong.play();
              ctrlIcon.classList.remove("fa-play");
              ctrlIcon.classList.add("fa-pause");
              thumbnail.style.animationPlayState = "running";
          }
      };

      currentlyPlayingSong.onended = function () {
          if (songArray && songArray.length > 0 && currentIndex !== null) {
              if (currentIndex < songArray.length - 1) {
                  currentIndex++;
                  handleSongClick(currentIndex);
              } else {
                  ctrlIcon.classList.remove("fa-pause");
                  ctrlIcon.classList.add("fa-play");
                  thumbnail.style.animationPlayState = "paused";
              }
          } else {
              console.error("Song array is undefined or empty, or currentIndex is null.");
          }
      };
  } else {
      console.error("Invalid index or songArray is undefined.");
  }
}



function playAndPause() {
  if (currentlyPlayingSong.paused) {
    currentlyPlayingSong.play();
    ctrlIcon.classList.remove("fa-play");
    ctrlIcon.classList.add("fa-pause");
    thumbnail.style.animationPlayState = "running"; 
  } else {
    currentlyPlayingSong.pause();
    ctrlIcon.classList.remove("fa-pause");
    ctrlIcon.classList.add("fa-play");
    thumbnail.style.animationPlayState = "paused";
  }
}

// Function to play the previous song
function previousSongPlay() {
  if (songArray && songArray.length > 0 && currentIndex !== null && currentIndex > 0) {  
    currentIndex--; 
    handleSongClick(currentIndex); 
  } else {
    alert("This is the first song in the list.");
  }
}

function nextSong() {
  if (songArray && songArray.length > 0 && currentIndex !== null) {  
    if (currentIndex < songArray.length - 1) { 
      currentIndex++; 
      handleSongClick(currentIndex); 
    } else {
      alert("This is the last song in the list."); 
    }
  } else {
    console.error("Song array is undefined or empty, or currentIndex is null.");
  }
}


// Call this function to start the process
displayStoredSongs();


sortIcon = document.getElementById('sortIcon');

sortIcon.addEventListener('click', (e)=>{
  e.preventDefault();
  songArray.sort((a, b)=>{
    const aName = a.name.toUpperCase();
    const bName = b.name.toUpperCase();

    if(aName < bName){
      return -1;
    }
    if(aName>bName){
      return 1;
    }

    return 0;
  })
  currentPlayingSong(songArray);
})


const searchInput = document.getElementById('search-bar');

searchInput.addEventListener('click', (e) => {
  e.preventDefault(); 

  searchIcon.onclick = function (){
    
    const searchInputValue = searchInput.value.trim().toLowerCase();
    const songList = document.querySelector('.song-list ul');
    let songFound = false; // Flag to track if a song is found

    songArray.forEach((song, songIndex) => {
      const songName = song.name.toLowerCase(); 
  
      if (songName.includes(searchInputValue)) { 
        songList.innerHTML = ''; // Clear the song list
        const li = document.createElement('li');

        const imgElement = document.createElement('img');
        imgElement.src = song.image || 'images/default-img.png';
        imgElement.alt = song.name || 'default-img';
        imgElement.classList.add('songImage'); 

        const pElementForSongName = document.createElement('p');
        pElementForSongName.textContent = song.name;
        pElementForSongName.classList.add('songName'); 

        const pElementForSongArtist = document.createElement('p');
        pElementForSongArtist.textContent = song.artist;
        pElementForSongArtist.classList.add('songArtist'); 

        const pElementForSongAlbum = document.createElement('p');
        pElementForSongAlbum.textContent = song.album;
        pElementForSongAlbum.classList.add('songAlbum');

        li.appendChild(imgElement);
        li.appendChild(pElementForSongName);
        li.appendChild(pElementForSongArtist);
        li.appendChild(pElementForSongAlbum);

        const index = songIndex;
        li.onclick = () => handleSongClick(index);

        songList.appendChild(li);
        songFound = true; // Mark that a song was found
      }
    });

    if (!songFound) {
      // If no song is found, display "Song not found!"
      songList.innerHTML = ''; 
      const li = document.createElement('li');

      const pElementForSongName = document.createElement('p');
      pElementForSongName.textContent = 'Song not found!';
      pElementForSongName.classList.add('songName'); 

      li.appendChild(pElementForSongName);
      songList.appendChild(li);
    }

    // Clear the search input field after the search
    searchInput.value = '';
  }
});

