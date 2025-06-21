document.addEventListener('DOMContentLoaded', () => {
  // Elementler
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const gallery = document.getElementById('gallery');
  const body = document.body;
  
  // Popup Elementleri
  const popup = document.getElementById('imagePopup');
  const popupImg = document.getElementById('popupImage');
  const popupClose = document.querySelector('.popup-close');
  const popupPrev = document.getElementById('popupPrev');
  const popupNext = document.getElementById('popupNext');

  // Silme Onay Elementleri
  const deleteConfirmPopup = document.getElementById('deleteConfirmPopup');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  
  // Galeri verileri
  let currentImages = [];
  let currentIndex = 0;
  let currentImageToDelete = null;

  // Arka Plan Karartma Elementi
  const bodyOverlay = document.createElement('div');
  bodyOverlay.className = 'body-overlay';
  document.body.appendChild(bodyOverlay);

  // Sürükle-Bırak Olayları
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropZone.addEventListener(event, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(event => {
    dropZone.addEventListener(event, highlight, false);
  });

  ['dragleave', 'drop'].forEach(event => {
    dropZone.addEventListener(event, unhighlight, false);
  });

  dropZone.addEventListener('drop', handleDrop, false);
  fileInput.addEventListener('change', handleFiles);

  // Galeriyi Yükle
  loadGallery();

  // Popup Kontrolleri
  popupClose.addEventListener('click', closeImagePopup);
  popup.addEventListener('click', (e) => {
    if (e.target.classList.contains('popup-close')) {
      closeImagePopup();
    }
    e.stopPropagation();
  });

  // Navigasyon Kontrolleri
  popupPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    showImage(currentIndex - 1);
  });

  popupNext.addEventListener('click', (e) => {
    e.stopPropagation();
    showImage(currentIndex + 1);
  });

  // Klavye ile geçiş
  document.addEventListener('keydown', (e) => {
    if (popup.classList.contains('active')) {
      if (e.key === 'ArrowLeft') {
        showImage(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        showImage(currentIndex + 1);
      }
    }
  });

  // Silme Onay Kontrolleri
  cancelDeleteBtn.addEventListener('click', closeDeletePopup);
  confirmDeleteBtn.addEventListener('click', confirmDelete);
  deleteConfirmPopup.addEventListener('click', (e) => e.stopPropagation());

  // Fonksiyonlar
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight() {
    dropZone.classList.add('highlight');
  }

  function unhighlight() {
    dropZone.classList.remove('highlight');
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
  }

  function handleFiles(e) {
    const files = e.target.files;
    if (!files.length) return;

    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('images', file));

    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    .then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Yükleme başarısız');
      }

      loadGallery();
      showToast('✅ Yükleme başarılı!');
    })
    .catch(error => {
      console.error(error);
      showToast(`❌ Hata: ${error.message}`);
    });
  }

  function loadGallery() {
    fetch('/api/images')
      .then(response => response.json())
      .then(images => {
        currentImages = images;
        gallery.innerHTML = images.length ? '' : '<p>Henüz resim eklenmedi</p>';
        
        images.forEach((image, index) => {
          const item = document.createElement('div');
          item.className = 'gallery-item';
          
          const img = document.createElement('img');
          img.src = image.url;
          img.addEventListener('click', () => {
            currentIndex = index;
            openImagePopup(image.url);
          });
          
          const delBtn = document.createElement('button');
          delBtn.className = 'delete-btn';
          delBtn.textContent = 'Sil';
          delBtn.onclick = (e) => {
            e.stopPropagation();
            openDeletePopup(image.filename);
          };
          
          item.append(img, delBtn);
          gallery.appendChild(item);
        });
      })
      .catch(console.error);
  }

  function showImage(index) {
    if (index >= 0 && index < currentImages.length) {
      popupImg.style.opacity = 0;
      
      setTimeout(() => {
        currentIndex = index;
        popupImg.src = currentImages[currentIndex].url;
        
        popupPrev.style.display = currentIndex > 0 ? 'flex' : 'none';
        popupNext.style.display = currentIndex < currentImages.length - 1 ? 'flex' : 'none';
        
        setTimeout(() => {
          popupImg.style.opacity = 1;
        }, 50);
      }, 300);
    }
  }

  function openImagePopup(imgSrc) {
    popupImg.src = imgSrc;
    popup.classList.add('active');
    body.style.overflow = 'hidden';
    
    popupPrev.style.display = currentIndex > 0 ? 'flex' : 'none';
    popupNext.style.display = currentIndex < currentImages.length - 1 ? 'flex' : 'none';
  }

  function closeImagePopup() {
    popup.classList.remove('active');
    body.style.overflow = 'auto';
  }

  function openDeletePopup(filename) {
    currentImageToDelete = filename;
    
    bodyOverlay.style.display = 'block';
    body.classList.add('darkened');
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.classList.add('disabled');
    });
    
    deleteConfirmPopup.classList.add('active');
  }

  function closeDeletePopup() {
    bodyOverlay.style.display = 'none';
    body.classList.remove('darkened');
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.classList.remove('disabled');
    });
    
    deleteConfirmPopup.classList.remove('active');
  }

  function confirmDelete() {
  closeDeletePopup();
  if (!currentImageToDelete) return;

  fetch(`/api/images/${currentImageToDelete}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        loadGallery();
        showToast('✅ Resim başarıyla silindi!');
      } else {
        showToast('❌ Silme işlemi başarısız!');
      }
    })
    .catch(error => {
      console.error(error);
      showToast(`❌ Hata: ${error.message}`);
    });
}

  // Toast popup fonksiyonu
  function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
});
