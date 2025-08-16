const socket = io();

// DOM elements
const home = document.getElementById('home');
// Removed unused: board
const joinBtn = document.getElementById('joinBtn');
const joinForm = document.getElementById('joinForm');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
// Removed unused: roomCode
const userList = document.getElementById('userList');
const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const eraserBtn = document.getElementById('eraserBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toolbar = document.getElementById('toolbar');
const colorPreview = document.getElementById('colorPreview');
const colorBtn = document.getElementById('colorBtn');
const colorPopover = document.getElementById('colorPopover');
const colorSwatches = document.getElementById('colorSwatches');
const penSizePreview = document.getElementById('penSizePreview');
const penSizeBtn = document.getElementById('penSizeBtn');
const penSizePopover = document.getElementById('penSizePopover');
const penSizeRange = document.getElementById('penSizeRange');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const stickyNoteBtn = document.getElementById('stickyNoteBtn');
const imageBtn = document.getElementById('imageBtn');
const multiPageBtn = document.getElementById('multiPageBtn');
// Removed unused: darkModeBtn
const emojiPopover = document.getElementById('emojiPopover');
const chatHeader = document.getElementById('chatHeader');
const clearChatBtn = document.getElementById('clearChatBtn');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const emojiBtn = document.getElementById('emojiBtn');
const typingIndicator = document.getElementById('typingIndicator');
const inviteLink = document.getElementById('inviteLink');
const copyInviteBtn = document.getElementById('copyInviteBtn');
const roomPassword = document.getElementById('roomPassword');
const setPasswordBtn = document.getElementById('setPasswordBtn');
const roleContainer = document.getElementById('roleContainer');
const notificationContainer = document.getElementById('notificationContainer');
const saveLoadExport = document.getElementById('saveLoadExport');
const avatarNicknameModal = document.getElementById('avatarNicknameModal');
const stickyNotes = document.getElementById('stickyNotes');
const whiteboard = document.getElementById('whiteboard');
// Removed unused: whiteboardContainer
const micBtn = document.getElementById('micBtn');
const remoteAudio = document.getElementById('remoteAudio');
// Map of peerId -> HTMLAudioElement for remote streams (supports multiple peers)
const remoteAudioEls = {};
const chatArea = document.getElementById('chatArea');
const chatFab = document.getElementById('chatFab');
const chatSidebarToggle = document.getElementById('chatSidebarToggle');
const mainContent = document.querySelector('.main-content');
const sidebarEl = document.querySelector('.sidebar');
const mobileBackdrop = document.getElementById('mobileBackdrop');

let drawing = false;
let last = null;
let roomId = null;
let username = null;
let userColor = null;
let penColor = null;
let penSize = 3;
let erasing = false;
let userColors = {};
let imagesOnCanvas = [];
let draggingImage = null;
let dragOffset = { x: 0, y: 0 };
let resizingImage = null;
let resizeStart = { x: 0, y: 0, w: 0, h: 0 };
let selectedImage = null;
let lockedImage = null;
let selectedStickyNote = null;
// Debounce to prevent multiple sticky notes per tap/click
let lastStickyCreate = 0;
let localStream = null;
let peerConnections = {};
let isMicOn = false;
let speakingInterval = null;
let audioContext = null;
let speakingUsers = new Set();
// WebRTC audio track reference (fix mic/voice)
let localAudioTrack = null;
// Stroke tracking for proper undo/redo
let strokeIdCounter = 0;
let activeStrokeId = null;

// Initialize multipage state early to avoid TDZ issues in functions used before join
let pages = [{ snapshot: null, notes: [], images: [], drawings: [] }];
let currentPage = 0;

// Debug: Check for missing DOM elements
[
  ['home', home],
  ['joinBtn', joinBtn],
  ['usernameInput', usernameInput],
  ['roomInput', roomInput],
  ['userList', userList],
  ['chatBox', chatBox],
  ['chatForm', chatForm],
  ['chatInput', chatInput],
  ['canvas', canvas],
  ['colorPicker', colorPicker],
  ['eraserBtn', eraserBtn],
  ['downloadBtn', downloadBtn],
  ['toolbar', toolbar],
  ['colorPreview', colorPreview],
  ['colorBtn', colorBtn],
  ['colorPopover', colorPopover],
  ['colorSwatches', colorSwatches],
  ['penSizePreview', penSizePreview],
  ['penSizeBtn', penSizeBtn],
  ['penSizePopover', penSizePopover],
  ['penSizeRange', penSizeRange],
  ['undoBtn', undoBtn],
  ['redoBtn', redoBtn],
  ['stickyNoteBtn', stickyNoteBtn],
  ['imageBtn', imageBtn],
  ['multiPageBtn', multiPageBtn],
  ['emojiPopover', emojiPopover],
  ['chatHeader', chatHeader],
  ['clearChatBtn', clearChatBtn],
  ['emojiBtn', emojiBtn],
  ['typingIndicator', typingIndicator],
  ['inviteLink', inviteLink],
  ['copyInviteBtn', copyInviteBtn],
  ['roomPassword', roomPassword],
  ['setPasswordBtn', setPasswordBtn],
  ['roleContainer', roleContainer],
  ['notificationContainer', notificationContainer],
  ['saveLoadExport', saveLoadExport],
  ['avatarNicknameModal', avatarNicknameModal],
  ['stickyNotes', stickyNotes],
  ['whiteboard', whiteboard],
  ['micBtn', micBtn],
  ['remoteAudio', remoteAudio],
].forEach(([name, el]) => {
  if (!el) console.error('Missing DOM element:', name);
});

// Generate a random color for each user
function getRandomColor() {
  const colors = [
    '#7c3aed', '#6366f1', '#059669', '#f59e42', '#f43f5e', '#eab308', '#0ea5e9', '#14b8a6', '#f472b6', '#a21caf'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Show notification to user
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  const container = document.getElementById('notificationContainer') || document.body;
  container.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// --- Collapsible Chat ---
function setChatCollapsed(collapsed) {
  if (!chatArea) return;
  chatArea.classList.toggle('collapsed', !!collapsed);
  if (chatToggleBtn) {
    chatToggleBtn.textContent = collapsed ? '⬆️' : '⬇️';
    chatToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  }
  // Redraw after layout height changes to prevent visual loss
  resizeCanvas();
  drawAll();
}
function updateChatFabVisibility() {
  if (!chatFab) return;
  chatFab.style.display = window.innerWidth <= 900 ? '' : 'none';
}
if (chatToggleBtn) {
  chatToggleBtn.onclick = (e) => {
    e.preventDefault();
    setChatCollapsed(!chatArea.classList.contains('collapsed'));
  };
}

// --- Sidebar show/hide (desktop canvas fullscreen) ---
function setSidebarHidden(hidden) {
  if (!mainContent) return;
  mainContent.classList.toggle('sidebar-hidden', !!hidden);
  // accessibility hint
  if (chatSidebarToggle) chatSidebarToggle.setAttribute('aria-pressed', String(!!hidden));

  // Force canvas area to recalculate its size and scroll position
  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    // Trigger a reflow to ensure proper sizing
    canvasArea.style.width = '100%';
    canvasArea.offsetHeight; // Force reflow
  }

  // Recompute canvas size with a slight delay to allow CSS transitions
  setTimeout(() => {
    resizeCanvas();
    drawAll();
    // Ensure scroll position is maintained
    if (canvasArea) {
      canvasArea.scrollLeft = Math.min(canvasArea.scrollLeft, canvasArea.scrollWidth - canvasArea.clientWidth);
      canvasArea.scrollTop = Math.min(canvasArea.scrollTop, canvasArea.scrollHeight - canvasArea.clientHeight);
    }
  }, 100);
}
if (chatSidebarToggle) {
  chatSidebarToggle.onclick = () => {
    const isHidden = mainContent.classList.contains('sidebar-hidden');
    setSidebarHidden(!isHidden);

    // Show a brief notification about the change
    const action = isHidden ? 'shown' : 'hidden';
    showNotification(`Chat panel ${action}. Use scroll to navigate the whiteboard.`, 'info');
  };
}
if (chatFab) {
  chatFab.onclick = () => {
    if (window.innerWidth <= 700) {
      // Open/close bottom drawer
      const open = !document.body.classList.contains('mobile-chat-open');
      document.body.classList.toggle('mobile-chat-open', open);
      if (mobileBackdrop) mobileBackdrop.style.display = open ? 'block' : 'none';
      // Always expand chat content when opening the drawer; collapse when closing
      if (open) {
        setChatCollapsed(false);
      } else {
        setChatCollapsed(true);
      }
    } else {
      const willCollapse = chatArea.classList.contains('collapsed');
      setChatCollapsed(!willCollapse);
    }
  };
}
if (mobileBackdrop) {
  mobileBackdrop.onclick = () => {
    document.body.classList.remove('mobile-chat-open');
    mobileBackdrop.style.display = 'none';
  };
}

// Clear chat
if (clearChatBtn) {
  clearChatBtn.onclick = () => { chatBox.innerHTML = ''; };
}

// Responsive canvas
function resizeCanvas() {
  // Set canvas to fixed large dimensions to ensure consistent drawing area
  const width = 2560; // Fixed width for 2K+ support
  const height = 1440; // Fixed height for 2K+ support

  // Set canvas to fixed large dimensions to prevent cutting off drawings
  canvas.width = width;
  canvas.height = height;
}

// Initialize custom scrollbars
function initCustomScrollbars() {
  const scrollableArea = document.querySelector('.canvas-scrollable');
  const verticalThumb = document.querySelector('.scrollbar-thumb-vertical');
  const horizontalThumb = document.querySelector('.scrollbar-thumb-horizontal');
  const verticalTrack = document.querySelector('.scrollbar-vertical');
  const horizontalTrack = document.querySelector('.scrollbar-horizontal');

  if (!scrollableArea || !verticalThumb || !horizontalThumb) return;

  let isDraggingVertical = false;
  let isDraggingHorizontal = false;
  let startY = 0;
  let startX = 0;
  let startScrollTop = 0;
  let startScrollLeft = 0;

  // Update scrollbar positions based on scroll
  function updateScrollbars() {
    const scrollTop = scrollableArea.scrollTop;
    const scrollLeft = scrollableArea.scrollLeft;
    const scrollHeight = scrollableArea.scrollHeight;
    const scrollWidth = scrollableArea.scrollWidth;
    const clientHeight = scrollableArea.clientHeight;
    const clientWidth = scrollableArea.clientWidth;

    // Calculate thumb positions and sizes
    const verticalRatio = clientHeight / scrollHeight;
    const horizontalRatio = clientWidth / scrollWidth;

    const thumbHeight = Math.max(20, verticalRatio * (clientHeight - 4));
    const thumbWidth = Math.max(20, horizontalRatio * (clientWidth - 4));

    const maxVerticalScroll = scrollHeight - clientHeight;
    const maxHorizontalScroll = scrollWidth - clientWidth;

    const thumbTop = maxVerticalScroll > 0 ? (scrollTop / maxVerticalScroll) * (clientHeight - thumbHeight - 4) : 0;
    const thumbLeft = maxHorizontalScroll > 0 ? (scrollLeft / maxHorizontalScroll) * (clientWidth - thumbWidth - 4) : 0;

    // Update thumb positions and sizes
    verticalThumb.style.height = thumbHeight + 'px';
    verticalThumb.style.top = thumbTop + 2 + 'px';

    horizontalThumb.style.width = thumbWidth + 'px';
    horizontalThumb.style.left = thumbLeft + 2 + 'px';

    // Show/hide scrollbars based on content
    verticalTrack.style.opacity = scrollHeight > clientHeight ? '1' : '0.3';
    horizontalTrack.style.opacity = scrollWidth > clientWidth ? '1' : '0.3';
  }

  // Vertical scrollbar drag
  verticalThumb.addEventListener('mousedown', (e) => {
    isDraggingVertical = true;
    startY = e.clientY;
    startScrollTop = scrollableArea.scrollTop;
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  // Horizontal scrollbar drag
  horizontalThumb.addEventListener('mousedown', (e) => {
    isDraggingHorizontal = true;
    startX = e.clientX;
    startScrollLeft = scrollableArea.scrollLeft;
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  // Mouse move handler
  document.addEventListener('mousemove', (e) => {
    if (isDraggingVertical) {
      const deltaY = e.clientY - startY;
      const scrollRatio = (scrollableArea.scrollHeight - scrollableArea.clientHeight) / (scrollableArea.clientHeight - verticalThumb.offsetHeight - 4);
      scrollableArea.scrollTop = startScrollTop + deltaY * scrollRatio;
    }

    if (isDraggingHorizontal) {
      const deltaX = e.clientX - startX;
      const scrollRatio = (scrollableArea.scrollWidth - scrollableArea.clientWidth) / (scrollableArea.clientWidth - horizontalThumb.offsetWidth - 4);
      scrollableArea.scrollLeft = startScrollLeft + deltaX * scrollRatio;
    }
  });

  // Mouse up handler
  document.addEventListener('mouseup', () => {
    isDraggingVertical = false;
    isDraggingHorizontal = false;
    document.body.style.userSelect = '';
  });

  // Track click handlers
  verticalTrack.addEventListener('click', (e) => {
    if (e.target === verticalThumb) return;
    const rect = verticalTrack.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const thumbCenter = verticalThumb.offsetTop + verticalThumb.offsetHeight / 2;
    const direction = clickY < thumbCenter ? -1 : 1;
    scrollableArea.scrollTop += direction * scrollableArea.clientHeight * 0.8;
  });

  horizontalTrack.addEventListener('click', (e) => {
    if (e.target === horizontalThumb) return;
    const rect = horizontalTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const thumbCenter = horizontalThumb.offsetLeft + horizontalThumb.offsetWidth / 2;
    const direction = clickX < thumbCenter ? -1 : 1;
    scrollableArea.scrollLeft += direction * scrollableArea.clientWidth * 0.8;
  });

  // Update scrollbars on scroll
  scrollableArea.addEventListener('scroll', updateScrollbars);

  // Initial update
  setTimeout(updateScrollbars, 100);

  // Store reference for other functions
  window.updateScrollbars = updateScrollbars;
}
window.addEventListener('resize', resizeCanvas);
// ResizeObserver for smoother canvas resize when layout changes
try {
  const area = document.querySelector('.canvas-area');
  if (window.ResizeObserver && area) {
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      drawAll();
    });
    ro.observe(area);
  }
} catch (_) { }

// Initialize UI on load
window.addEventListener('DOMContentLoaded', () => {
  // Ensure name field starts empty and browsers don't autofill
  if (usernameInput) {
    usernameInput.value = '';
    usernameInput.setAttribute('autocomplete', 'off');
    usernameInput.setAttribute('autocapitalize', 'off');
    usernameInput.setAttribute('autocorrect', 'off');
    usernameInput.setAttribute('spellcheck', 'false');
  }
  // Ensure canvas has correct size before any drawing
  resizeCanvas();
  // Default: open chat panel on load
  setChatCollapsed(false);
  updateChatFabVisibility();
  // Default: show sidebar; user can hide it via toggle for full-width canvas
  setSidebarHidden(false);
  // Initialize scroll hint
  initScrollHint();
  // Initialize keyboard navigation
  initKeyboardNavigation();
  // Remove any remaining scroll indicators
  removeScrollIndicators();
  // Normalize toolbar buttons padding and size
  try {
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.style.padding = '8px 10px';
      btn.style.minWidth = '40px';
      btn.style.minHeight = '40px';
      btn.style.lineHeight = '1';
    });
    const psp = document.getElementById('penSizePreview');
    if (psp) { psp.style.width = '40px'; psp.style.height = '18px'; }
  } catch (_) {}
  // Remove Pages button from toolbox if present
  try { if (typeof multiPageBtn !== 'undefined' && multiPageBtn) multiPageBtn.remove(); } catch (_) {}
  // Hide invite URL input (use only copy button)
  try {
    const il = document.getElementById('inviteLink');
    if (il) il.style.display = 'none';
  } catch (_) {}
});

// Remove any remaining scroll indicators
function removeScrollIndicators() {
  // Remove any elements with scroll indicator classes
  const indicators = document.querySelectorAll('.scroll-indicator, .scroll-position, .position-indicator, [class*="scroll-indicator"], [class*="position-indicator"]');
  indicators.forEach(el => el.remove());

  // Also check for any dynamically created indicators
  setTimeout(() => {
    const moreIndicators = document.querySelectorAll('.scroll-indicator, .scroll-position, .position-indicator, [class*="scroll-indicator"], [class*="position-indicator"]');
    moreIndicators.forEach(el => el.remove());
  }, 1000);
}

// Simple scroll hint management
function initScrollHint() {
  const scrollHint = document.getElementById('scrollHint');
  const canvasArea = document.querySelector('.canvas-area');

  if (!scrollHint || !canvasArea) return;

  // Hide hint after user scrolls or after 5 seconds
  let hintTimeout = setTimeout(() => {
    scrollHint.classList.add('hidden');
  }, 5000);

  canvasArea.addEventListener('scroll', () => {
    clearTimeout(hintTimeout);
    scrollHint.classList.add('hidden');
  }, { once: true });

  // Also hide on first drawing action
  canvas.addEventListener('mousedown', () => {
    clearTimeout(hintTimeout);
    scrollHint.classList.add('hidden');
  }, { once: true });

  canvas.addEventListener('touchstart', () => {
    clearTimeout(hintTimeout);
    scrollHint.classList.add('hidden');
  }, { once: true });
}

// Keyboard navigation for canvas scrolling
function initKeyboardNavigation() {
  const canvasArea = document.querySelector('.canvas-area');
  if (!canvasArea) return;

  document.addEventListener('keydown', (e) => {
    // Only handle keys when not typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
      return;
    }

    const scrollAmount = 50;
    let handled = false;

    switch (e.key) {
      case 'ArrowLeft':
        canvasArea.scrollLeft -= scrollAmount;
        handled = true;
        break;
      case 'ArrowRight':
        canvasArea.scrollLeft += scrollAmount;
        handled = true;
        break;
      case 'ArrowUp':
        canvasArea.scrollTop -= scrollAmount;
        handled = true;
        break;
      case 'ArrowDown':
        canvasArea.scrollTop += scrollAmount;
        handled = true;
        break;
      case 'Home':
        if (e.ctrlKey) {
          canvasArea.scrollLeft = 0;
          canvasArea.scrollTop = 0;
          handled = true;
        }
        break;
      case 'End':
        if (e.ctrlKey) {
          canvasArea.scrollLeft = canvasArea.scrollWidth;
          canvasArea.scrollTop = canvasArea.scrollHeight;
          handled = true;
        }
        break;
    }

    if (handled) {
      e.preventDefault();
      showNotification('Use arrow keys to navigate, Ctrl+Home for top-left, Ctrl+End for bottom-right', 'info');
    }
  });
}

// Scroll hint management
function initScrollHint() {
  const scrollHint = document.getElementById('scrollHint');
  const canvasArea = document.querySelector('.canvas-area');

  if (!scrollHint || !canvasArea) return;

  // Update hint text to be more specific about both directions
  scrollHint.innerHTML = '<span>💡 Tip: Scroll horizontally & vertically to see the full drawing area</span>';

  // Hide hint after user scrolls or after 7 seconds (longer for more detailed message)
  let hintTimeout = setTimeout(() => {
    scrollHint.classList.add('hidden');
  }, 7000);

  canvasArea.addEventListener('scroll', () => {
    clearTimeout(hintTimeout);
    scrollHint.classList.add('hidden');
  }, { once: true });

  // Also hide on first drawing action
  canvas.addEventListener('mousedown', () => {
    clearTimeout(hintTimeout);
    scrollHint.classList.add('hidden');
  }, { once: true });

  canvas.addEventListener('touchstart', () => {
    clearTimeout(hintTimeout);
    scrollHint.classList.add('hidden');
  }, { once: true });

  // Add scroll position indicator
  addScrollIndicator(canvasArea);
}

// Add scroll position indicator
function addScrollIndicator(canvasArea) {
  // Create scroll position indicator
  const scrollIndicator = document.createElement('div');
  scrollIndicator.className = 'scroll-indicator';
  scrollIndicator.innerHTML = `
    <div class="scroll-position">
      <span class="scroll-x">H: 0%</span>
      <span class="scroll-y">V: 0%</span>
    </div>
  `;
  canvasArea.appendChild(scrollIndicator);

  // Update scroll position indicator
  let scrollTimeout;
  canvasArea.addEventListener('scroll', () => {
    const scrollXPercent = Math.round((canvasArea.scrollLeft / (canvasArea.scrollWidth - canvasArea.clientWidth)) * 100) || 0;
    const scrollYPercent = Math.round((canvasArea.scrollTop / (canvasArea.scrollHeight - canvasArea.clientHeight)) * 100) || 0;

    scrollIndicator.querySelector('.scroll-x').textContent = `H: ${scrollXPercent}%`;
    scrollIndicator.querySelector('.scroll-y').textContent = `V: ${scrollYPercent}%`;

    // Show indicator while scrolling
    canvasArea.classList.add('scrolling');
    scrollIndicator.style.opacity = '0.8';

    // Hide indicator after scrolling stops
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      canvasArea.classList.remove('scrolling');
      scrollIndicator.style.opacity = '0';
    }, 1500);
  });
}

// Drawing events (use precise mouse-to-canvas mapping)
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}
canvas.addEventListener('mousedown', (e) => {
  const mouse = getCanvasCoords(e);
  if (lockedImage) {
    selectedImage = null;
    drawAll();
    drawing = true;
    last = getCanvasCoords(e);
    activeStrokeId = ++strokeIdCounter;
    return;
  }
  let found = false;
  for (let i = imagesOnCanvas.length - 1; i >= 0; i--) {
    const img = imagesOnCanvas[i];
    if (
      mouse.x > img.x + img.w - 12 && mouse.x < img.x + img.w + 8 &&
      mouse.y > img.y + img.h - 12 && mouse.y < img.y + img.h + 8
    ) {
      selectedImage = img;
      resizingImage = img;
      resizeStart = { x: mouse.x, y: mouse.y, w: img.w, h: img.h };
      found = true;
      drawAll();
      return;
    }
    if (
      mouse.x > img.x && mouse.x < img.x + img.w &&
      mouse.y > img.y && mouse.y < img.y + img.h
    ) {
      selectedImage = img;
      draggingImage = img;
      dragOffset = { x: mouse.x - img.x, y: mouse.y - img.y };
      found = true;
      drawAll();
      return;
    }
  }
  if (!found) {
    selectedImage = null;
    drawAll();
    drawing = true;
    last = getCanvasCoords(e);
    activeStrokeId = ++strokeIdCounter;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const mouse = getCanvasCoords(e);
  let overHandle = false, overImage = false;
  for (let i = imagesOnCanvas.length - 1; i >= 0; i--) {
    const img = imagesOnCanvas[i];
    if (
      mouse.x > img.x + img.w - 12 && mouse.x < img.x + img.w + 8 &&
      mouse.y > img.y + img.h - 12 && mouse.y < img.y + img.h + 8
    ) {
      overHandle = true;
      break;
    }
    if (
      mouse.x > img.x && mouse.x < img.x + img.w &&
      mouse.y > img.y && mouse.y < img.y + img.h
    ) {
      overImage = true;
      break;
    }
  }
  if (overHandle) {
    canvas.style.cursor = 'nwse-resize';
  } else if (overImage) {
    canvas.style.cursor = 'grab';
  } else {
    canvas.style.cursor = drawing ? 'crosshair' : 'default';
  }
  if (resizingImage) {
    resizingImage.w = Math.max(30, resizeStart.w + (mouse.x - resizeStart.x));
    resizingImage.h = Math.max(30, resizeStart.h + (mouse.y - resizeStart.y));
    drawAll();
    // Emit resize event (page-aware)
    socket.emit('image-resize', { src: resizingImage.src, x: resizingImage.x, y: resizingImage.y, w: resizingImage.w, h: resizingImage.h, page: currentPage });
    return;
  }
  if (draggingImage) {
    draggingImage.x = mouse.x - dragOffset.x;
    draggingImage.y = mouse.y - dragOffset.y;
    drawAll();
    // Emit move event (page-aware)
    socket.emit('image-move', { src: draggingImage.src, x: draggingImage.x, y: draggingImage.y, w: draggingImage.w, h: draggingImage.h, page: currentPage });
    return;
  }
  if (!drawing) return;
  const curr = getCanvasCoords(e);
  drawLine(last, curr, penColor, penSize, true, true);
  last = curr;
});

canvas.addEventListener('mouseup', () => {
  draggingImage = null;
  resizingImage = null;
  drawing = false;
  last = null;
  activeStrokeId = null;
  saveCurrentPage();
});
canvas.addEventListener('mouseout', () => {
  draggingImage = null;
  resizingImage = null;
  drawing = false;
  last = null;
  activeStrokeId = null;
  saveCurrentPage();
});

// --- Touch Support for Mobile Drawing ---
function getTouchCoords(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (touch.clientX - rect.left) * (canvas.width / rect.width),
    y: (touch.clientY - rect.top) * (canvas.height / rect.height)
  };
}
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  // Only prevent default if we're actually drawing (not scrolling)
  if (e.touches.length === 1) {
    e.preventDefault();
    // Start a new stroke on first touch
    const t = e.touches[0];
    drawing = true;
    last = getTouchCoords(t);
    activeStrokeId = ++strokeIdCounter;
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  if (!drawing) return;
  if (!e.touches || e.touches.length === 0) return;
  // Only prevent default when actively drawing
  if (e.touches.length === 1 && drawing) {
    e.preventDefault();
    const t = e.touches[0];
    const curr = getTouchCoords(t);
    drawLine(last, curr, penColor, penSize, true, true);
    last = curr;
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  drawing = false;
  last = null;
  activeStrokeId = null;
  saveCurrentPage();
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
  e.preventDefault();
  drawing = false;
  last = null;
  activeStrokeId = null;
}, { passive: false });

function drawLine(from, to, color, size, emit, save) {
  const prevComp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.closePath();
  ctx.globalCompositeOperation = prevComp;
  if (save) {
    if (!pages[currentPage].drawings) pages[currentPage].drawings = [];
    const drawing = { from, to, color, size, user: username, strokeId: activeStrokeId, erase: !!erasing };
    pages[currentPage].drawings.push(drawing);
    if (drawing.user === username) redoStack = [];
  }
  if (emit) {
    socket.emit('draw', { from, to, color, size, user: username, page: currentPage, strokeId: activeStrokeId, erase: !!erasing });
  }
}

socket.on('draw', (data) => {
  const targetPage = typeof data.page === 'number' ? data.page : 0;
  // Ensure pages array can hold target page
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].drawings) pages[targetPage].drawings = [];
  pages[targetPage].drawings.push({ from: data.from, to: data.to, color: data.color, size: data.size, user: data.user, strokeId: data.strokeId, erase: !!data.erase });
  if (targetPage === currentPage) {
    // Draw only if on the same page
    const prevComp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = data.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(data.from.x, data.from.y);
    ctx.lineTo(data.to.x, data.to.y);
    ctx.stroke();
    ctx.closePath();
    ctx.globalCompositeOperation = prevComp;
  }
});

// Chat events
chatForm.onsubmit = (e) => {
  e.preventDefault();
  if (chatInput.value.trim()) {
    socket.emit('chat', chatInput.value.trim());
    chatInput.value = '';
  }
};
socket.on('chat', (msg) => {
  const div = document.createElement('div');
  div.className = 'msg';
  const color = userColors[msg.user] || '#7c3aed';
  const time = msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  div.innerHTML = `<span class="user"><span class="user-avatar" style="background:${color}"></span>${msg.user}:</span> ${msg.message} <span class="timestamp">${time}</span>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Typing indicator emit/debounce
let typingTimeout;
chatInput.addEventListener('input', () => {
  socket.emit('typing', chatInput.value.trim().length > 0);
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing', false), 1000);
});
socket.on('typing', (name) => {
  typingIndicator.textContent = name ? `${name} is typing...` : '';
});

// User list
socket.on('user-list', (users) => {
  updateUserList(users);
  if (!window.voiceJoined) {
    socket.emit('voice-join', roomId, username);
    window.voiceJoined = true;
  }
});

// Utility: clear canvas on join
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
socket.on('connect', clearCanvas);

// --- Toolbar Popover Logic ---
function closeAllPopovers() {
  if (colorPopover) colorPopover.classList.remove('active');
  if (penSizePopover) penSizePopover.classList.remove('active');
}

function positionPopover(popover, button) {
  if (!popover || !button) return;

  const buttonRect = button.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();

  // Position below the button, centered
  let left = buttonRect.left + (buttonRect.width / 2) - (popoverRect.width / 2);
  let top = buttonRect.bottom + 12;

  // Keep popover within viewport
  if (left < 10) left = 10;
  if (left + popoverRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popoverRect.width - 10;
  }
  if (top + popoverRect.height > window.innerHeight - 10) {
    top = buttonRect.top - popoverRect.height - 12;
  }

  // Use fixed positioning to anchor to viewport and ensure it stays aligned with the button
  popover.style.position = 'fixed';
  popover.style.zIndex = '1000';
  popover.style.left = left + 'px';
  popover.style.top = top + 'px';
}

if (colorBtn) {
  colorBtn.onclick = (e) => {
    e.stopPropagation();
    closeAllPopovers();
    if (colorPopover) {
      colorPopover.classList.add('active');
      // Position after a brief delay to ensure popover is rendered
      setTimeout(() => positionPopover(colorPopover, colorBtn), 10);
    }
  };
}

if (penSizeBtn) {
  penSizeBtn.onclick = (e) => {
    e.stopPropagation();
    closeAllPopovers();
    if (penSizePopover) {
      penSizePopover.classList.add('active');
      // Position after a brief delay to ensure popover is rendered
      setTimeout(() => positionPopover(penSizePopover, penSizeBtn), 10);
    }
  };
}

document.body.addEventListener('click', closeAllPopovers);
if (toolbar) toolbar.addEventListener('click', (e) => e.stopPropagation());
// Prevent clicks inside popovers from closing them
if (colorPopover) colorPopover.addEventListener('click', (e) => e.stopPropagation());
if (penSizePopover) penSizePopover.addEventListener('click', (e) => e.stopPropagation());

// --- Color Swatches ---
const SWATCHES = [
  '#7c3aed', '#6366f1', '#059669', '#f59e42', '#f43f5e', '#eab308', '#0ea5e9', '#14b8a6', '#f472b6', '#a21caf', '#000', '#fff'
];

// --- Emoji Picker ---
const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤩', '😇',
  '🙂', '😉', '😌', '😅', '🤗', '🤝', '👍', '👏', '🙏', '💪',
  '🎉', '✨', '🔥', '💯', '✅', '❌', '⚡', '💡', '🧠', '📝',
  '📌', '📎', '📷', '🎤', '🎧', '🖼️', '📄', '✏️', '🖊️', '🧭'
];

function openEmojiPopover() {
  if (!emojiPopover || !emojiBtn) return;
  // Build grid lazily once
  if (!emojiPopover.dataset.loaded) {
    const frag = document.createDocumentFragment();
    EMOJIS.forEach(ch => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emoji-item';
      b.textContent = ch;
      b.onclick = () => {
        insertEmoji(ch);
        closeEmojiPopover();
      };
      frag.appendChild(b);
    });
    emojiPopover.appendChild(frag);
    emojiPopover.dataset.loaded = '1';
  }
  // Show temporarily to measure, then position within viewport near the button
  emojiPopover.style.display = 'grid';
  emojiPopover.style.visibility = 'hidden';
  // Keep the popover anchored to the viewport and make it scrollable if needed
  emojiPopover.style.position = 'fixed';
  emojiPopover.style.maxHeight = '60vh';
  emojiPopover.style.overflowY = 'auto';
  emojiPopover.style.overflowX = 'hidden';
  emojiPopover.style.maxWidth = '90vw';
  emojiPopover.style.boxSizing = 'border-box';
  const btnRect = emojiBtn.getBoundingClientRect();
  const popW = emojiPopover.offsetWidth || 220;
  const popH = emojiPopover.offsetHeight || 200;
  // Prefer below the button; if no space, place above
  let top = btnRect.bottom + 8;
  if (top + popH > window.innerHeight - 8) {
    top = btnRect.top - popH - 8;
    if (top < 8) top = Math.max(8, window.innerHeight - popH - 8);
  }
  let left = btnRect.left;
  if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
  if (left < 8) left = 8;
  emojiPopover.style.top = top + 'px';
  emojiPopover.style.left = left + 'px';
  emojiPopover.style.visibility = 'visible';
  // Make the popover focusable so users can scroll with keyboard as well
  emojiPopover.setAttribute('tabindex', '-1');
  try { emojiPopover.focus({ preventScroll: true }); } catch (_) {}
  setTimeout(() => document.addEventListener('click', handleEmojiDocClick, { once: true }), 0);
}

function closeEmojiPopover() {
  if (!emojiPopover) return;
  emojiPopover.style.display = 'none';
}

function handleEmojiDocClick(e) {
  if (!emojiPopover || !emojiBtn) return;
  if (emojiPopover.contains(e.target) || emojiBtn.contains(e.target)) return;
  closeEmojiPopover();
}

function insertEmoji(ch) {
  if (!chatInput) return;
  const start = chatInput.selectionStart || chatInput.value.length;
  const end = chatInput.selectionEnd || chatInput.value.length;
  const val = chatInput.value;
  chatInput.value = val.slice(0, start) + ch + val.slice(end);
  const pos = start + ch.length;
  chatInput.setSelectionRange(pos, pos);
  chatInput.focus();
}

if (emojiBtn) {
  emojiBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (emojiPopover && emojiPopover.style.display === 'grid') {
      closeEmojiPopover();
    } else {
      openEmojiPopover();
    }
  });
}

// Close emoji popover on resize/orientation change
window.addEventListener('resize', closeEmojiPopover);
window.addEventListener('orientationchange', closeEmojiPopover);

// Close all popovers on window resize
window.addEventListener('resize', closeAllPopovers);
window.addEventListener('orientationchange', closeAllPopovers);

// --- Color and Pen Size Management ---
function renderSwatches() {
  if (!colorSwatches) return;
  colorSwatches.innerHTML = '';
  SWATCHES.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = color;
    if (colorPicker && colorPicker.value === color) sw.classList.add('selected');
    sw.onclick = () => {
      if (colorPicker) colorPicker.value = color;
      penColor = color;
      updateColorPreview();
      renderSwatches();
      closeAllPopovers();
    };
    colorSwatches.appendChild(sw);
  });
}

function updateColorPreview() {
  if (colorPreview) {
    colorPreview.style.background = penColor || '#7c3aed';
  }
}

function updatePenSizePreview() {
  if (penSizePreview) {
    const line = penSizePreview.querySelector('.pen-size-line');
    if (line) {
      line.style.height = (penSize || 4) + 'px';
    }
  }
}

// Initialize color picker
if (colorPicker) {
  colorPicker.oninput = (e) => {
    penColor = e.target.value;
    updateColorPreview();
    renderSwatches();
  };
}

// Initialize pen size range
if (penSizeRange) {
  penSizeRange.oninput = (e) => {
    penSize = parseInt(e.target.value);
    updatePenSizePreview();
    // Update the display value
    const penSizeValue = document.getElementById('penSizeValue');
    if (penSizeValue) {
      penSizeValue.textContent = penSize;
    }
  };
}

// Set initial values
penColor = penColor || '#7c3aed';
penSize = penSize || 4;

// Initialize UI
if (colorPicker) colorPicker.value = penColor;
if (penSizeRange) penSizeRange.value = penSize;
updateColorPreview();
renderSwatches();
updatePenSizePreview();
function renderSwatches() {
  colorSwatches.innerHTML = '';
  SWATCHES.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = color;
    if (colorPicker.value === color) sw.classList.add('selected');
    sw.onclick = () => {
      colorPicker.value = color;
      penColor = color;
      updateColorPreview();
      renderSwatches();
      colorPopover.classList.remove('active');
    };
    colorSwatches.appendChild(sw);
  });
}
colorPicker.oninput = (e) => {
  penColor = e.target.value;
  updateColorPreview();
  renderSwatches();
};
function updateColorPreview() {
  colorPreview.style.background = penColor;
}
// --- Pen Size Preview ---
function updatePenSizePreview() {
  penSizePreview.innerHTML = `<div class="pen-size-line" style="width:28px;height:${penSize}px;"></div>`;
}
penSizeRange.oninput = (e) => {
  penSize = parseInt(e.target.value);
  updatePenSizePreview();
  const penSizeValue = document.getElementById('penSizeValue');
  if (penSizeValue) {
    penSizeValue.textContent = penSize;
  }
};
// --- Tooltips (native via title attr, see HTML) ---
// --- Initial Render ---
colorPicker.value = penColor || '#7c3aed';
updateColorPreview();
renderSwatches();
penSizeRange.value = penSize;
updatePenSizePreview();
const penSizeValueEl = document.getElementById('penSizeValue');
if (penSizeValueEl) { penSizeValueEl.textContent = penSize; }

// --- Sticky Notes ---
if (stickyNoteBtn) {
  stickyNoteBtn.onclick = () => {
    const now = Date.now();
    if (now - lastStickyCreate < 400) return; // debounce rapid taps/clicks
    lastStickyCreate = now;
    // Place initial note at top-left for predictability
    const x = 20;
    const y = 20;
    createStickyNote(x, y, 'Click to edit...');
  };
}

function createStickyNote(x, y, text = 'Click to edit...', color = '#fffbe7') {
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.contentEditable = true;
  note.style.left = x + 'px';
  note.style.top = y + 'px';
  note.style.background = color;
  note.innerText = text;
  note.dataset.id = Date.now().toString();

  // Add color picker button
  const colorBtn = document.createElement('button');
  colorBtn.className = 'sticky-note-color';
  colorBtn.innerHTML = '🎨';
  colorBtn.onclick = (e) => {
    e.stopPropagation();
    showStickyColorPicker(note);
  };

  note.appendChild(colorBtn);
  // Select on touch
  note.addEventListener('touchstart', (e) => { e.stopPropagation(); setSelectedStickyNote(note); });

  // Make draggable
  note.onmousedown = (e) => {
    if (e.target === colorBtn) return;
    setSelectedStickyNote(note);
    let shiftX = e.clientX - note.offsetLeft;
    let shiftY = e.clientY - note.offsetTop;

    function moveAt(pageX, pageY) {
      note.style.left = pageX - shiftX + 'px';
      note.style.top = pageY - shiftY + 'px';
    }

    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }

    document.addEventListener('mousemove', onMouseMove);

    note.onmouseup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      note.onmouseup = null;
      socket.emit('sticky-move', {
        id: note.dataset.id,
        left: note.style.left,
        top: note.style.top,
        text: note.innerText,
        color: note.style.background,
        page: currentPage
      });
      saveCurrentPage();
    };
  };

  // Handle text editing
  note.oninput = () => {
    socket.emit('sticky-edit', {
      id: note.dataset.id,
      left: note.style.left,
      top: note.style.top,
      text: note.innerText,
      color: note.style.background,
      page: currentPage
    });
    saveCurrentPage();
  };

  stickyNotes.appendChild(note);
  setSelectedStickyNote(note);

  // Emit to other users
  socket.emit('sticky-add', {
    id: note.dataset.id,
    left: note.style.left,
    top: note.style.top,
    text: note.innerText,
    color: note.style.background,
    page: currentPage
  });

  saveCurrentPage();
  return note;
}

function showStickyColorPicker(note) {
  const colors = ['#fffbe7', '#fef3c7', '#fecaca', '#fed7d7', '#e0e7ff', '#d1fae5', '#f3e8ff', '#fce7f3'];

  const picker = document.createElement('div');
  picker.className = 'sticky-color-picker';
  picker.style.position = 'absolute';
  picker.style.top = '30px';
  picker.style.right = '0';
  picker.style.background = 'white';
  picker.style.border = '2px solid #e5e7eb';
  picker.style.borderRadius = '8px';
  picker.style.padding = '8px';
  picker.style.display = 'grid';
  picker.style.gridTemplateColumns = 'repeat(4, 20px)';
  picker.style.gap = '4px';
  picker.style.zIndex = '1000';
  picker.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

  colors.forEach(color => {
    const colorBtn = document.createElement('button');
    colorBtn.style.width = '20px';
    colorBtn.style.height = '20px';
    colorBtn.style.background = color;
    colorBtn.style.border = '1px solid #ccc';
    colorBtn.style.borderRadius = '4px';
    colorBtn.style.cursor = 'pointer';
    colorBtn.onclick = () => {
      note.style.background = color;
      socket.emit('sticky-edit', {
        id: note.dataset.id,
        left: note.style.left,
        top: note.style.top,
        text: note.innerText,
        color: color,
        page: currentPage
      });
      saveCurrentPage();
      picker.remove();
    };
    picker.appendChild(colorBtn);
  });

  note.appendChild(picker);

  // Remove picker when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function removePicker(e) {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', removePicker);
      }
    });
  }, 0);
}

// Utility: ensure sticky note controls exist and sync delete visibility
function ensureStickyControls(note) {
  if (!note) return;
  // Ensure color button exists
  let colorBtn = note.querySelector('.sticky-note-color');
  if (!colorBtn) {
    colorBtn = document.createElement('button');
    colorBtn.className = 'sticky-note-color';
    colorBtn.innerHTML = '🎨';
    colorBtn.onclick = (e) => {
      e.stopPropagation();
      showStickyColorPicker(note);
    };
    note.appendChild(colorBtn);
  }
}

// Socket events for sticky notes




// --- Undo/Redo Stack ---
let undoStack = [], redoStack = [];
function saveState() {
  undoStack.push(whiteboard.toDataURL());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}
function restoreState(stackFrom, stackTo) {
  if (!stackFrom.length) return;
  stackTo.push(whiteboard.toDataURL());
  const img = new window.Image();
  img.onload = () => {
    ctx.clearRect(0, 0, whiteboard.width, whiteboard.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = stackFrom.pop();
}
undoBtn.onclick = () => {
  if (!pages[currentPage].drawings || pages[currentPage].drawings.length === 0) return;
  // Find the last stroke by this user
  let targetStrokeId = null;
  for (let i = pages[currentPage].drawings.length - 1; i >= 0; i--) {
    const seg = pages[currentPage].drawings[i];
    if (seg.user === username) { targetStrokeId = seg.strokeId ?? null; break; }
  }
  if (targetStrokeId == null) return;
  // Remove all segments belonging to that stroke (preserve original order for redo)
  const removedSegments = [];
  for (let i = pages[currentPage].drawings.length - 1; i >= 0; i--) {
    const seg = pages[currentPage].drawings[i];
    if (seg.strokeId === targetStrokeId && seg.user === username) {
      removedSegments.push(pages[currentPage].drawings.splice(i, 1)[0]);
    }
  }
  removedSegments.reverse();
  if (removedSegments.length === 0) return;
  // Push to redo stack as a stroke bundle
  redoStack.push(removedSegments);
  // Inform peers to remove each segment
  removedSegments.forEach(seg => {
    socket.emit('undo-drawing', { user: username, from: seg.from, to: seg.to, color: seg.color, size: seg.size, page: currentPage });
  });
  drawAll();
};

// Redo full last undone stroke
if (typeof redoBtn !== 'undefined' && redoBtn) {
  redoBtn.onclick = () => {
    if (!redoStack || redoStack.length === 0) return;
    const segments = redoStack.pop();
    if (!pages[currentPage].drawings) pages[currentPage].drawings = [];
    segments.forEach(seg => {
      // Re-add segment locally
      pages[currentPage].drawings.push(seg);
      // Re-emit to peers to redraw and save on their side (page-aware)
      socket.emit('draw', { from: seg.from, to: seg.to, color: seg.color, size: seg.size, user: seg.user, page: currentPage, strokeId: seg.strokeId });
    });
    drawAll();
  };
}
socket.on('undo-drawing', (data) => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  if (!pages[targetPage] || !pages[targetPage].drawings) return;
  for (let i = pages[targetPage].drawings.length - 1; i >= 0; i--) {
    const d = pages[targetPage].drawings[i];
    if (d.user === data.user && d.from.x === data.from.x && d.from.y === data.from.y && d.to.x === data.to.x && d.to.y === data.to.y && d.color === data.color && d.size === data.size) {
      pages[targetPage].drawings.splice(i, 1);
      if (targetPage === currentPage) drawAll();
      break;
    }
  }
});
// Save state on drawing
whiteboard.addEventListener('mousedown', saveState);

// --- Multi-Page Whiteboard ---
// (initialized earlier)

function saveCurrentPage() {
  // Save a snapshot of the full canvas (drawings, images, etc)
  pages[currentPage].snapshot = canvas.toDataURL('image/png');
  // Save sticky notes
  pages[currentPage].notes = Array.from(stickyNotes.children).map(note => ({
    id: note.dataset.id,
    text: note.innerText,
    left: note.style.left,
    top: note.style.top
  }));
  // Save images (store src, x, y, w, h)
  pages[currentPage].images = imagesOnCanvas.map(obj => ({
    src: obj.img.src,
    x: obj.x, y: obj.y, w: obj.w, h: obj.h
  }));
  // Drawings are already in memory
}
function loadPage(idx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Restore images
  imagesOnCanvas = [];
  if (!pages[idx].drawings) pages[idx].drawings = [];
  if (pages[idx] && pages[idx].images) {
    let loaded = 0;
    const total = pages[idx].images.length;
    if (total === 0) drawAll();
    pages[idx].images.forEach(obj => {
      const img = new window.Image();
      img.onload = function () {
        imagesOnCanvas.push({ img, x: obj.x, y: obj.y, w: obj.w, h: obj.h });
        loaded++;
        if (loaded === total) drawAll();
      };
      img.src = obj.src;
    });
  } else {
    drawAll();
  }
  // Remove all sticky notes
  stickyNotes.innerHTML = '';
  // Restore sticky notes for this page
  if (pages[idx] && pages[idx].notes) {
    pages[idx].notes.forEach(noteData => {
      const note = document.createElement('div');
      note.className = 'sticky-note';
      note.contentEditable = true;
      note.style.left = noteData.left;
      note.style.top = noteData.top;
      note.innerText = noteData.text;
      note.dataset.id = noteData.id || generateNoteId();
      note.addEventListener('mousedown', () => setSelectedStickyNote(note));
      note.addEventListener('touchstart', (e) => { e.stopPropagation(); setSelectedStickyNote(note); });
      note.onmousedown = (e) => {
        setSelectedStickyNote(note);
        let shiftX = e.clientX - note.offsetLeft;
        let shiftY = e.clientY - note.offsetTop;
        function moveAt(pageX, pageY) {
          note.style.left = pageX - shiftX + 'px';
          note.style.top = pageY - shiftY + 'px';
        }
        function onMouseMove(e) {
          moveAt(e.pageX, e.pageY);
        }
        document.addEventListener('mousemove', onMouseMove);
        note.onmouseup = () => {
          document.removeEventListener('mousemove', onMouseMove);
          note.onmouseup = null;
          saveCurrentPage();
        };
      };
      note.ondblclick = () => { note.remove(); saveCurrentPage(); };
      note.oninput = () => saveCurrentPage();
      // Attach handlers so moving/editing/deleting emits page-aware events
      note.onmousedown = (e) => {
        setSelectedStickyNote(note);
        let shiftX = e.clientX - note.offsetLeft;
        let shiftY = e.clientY - note.offsetTop;
        function moveAt(pageX, pageY) {
          note.style.left = pageX - shiftX + 'px';
          note.style.top = pageY - shiftY + 'px';
          socket.emit('sticky-move', { id: note.dataset.id, left: note.style.left, top: note.style.top, text: note.innerText, page: currentPage });
        }
        function onMouseMove(e) {
          moveAt(e.pageX, e.pageY);
        }
        document.addEventListener('mousemove', onMouseMove);
        note.onmouseup = () => {
          document.removeEventListener('mousemove', onMouseMove);
          note.onmouseup = null;
          saveCurrentPage();
        };
      };
      note.ondblclick = () => { note.remove(); socket.emit('sticky-delete', { id: note.dataset.id, page: currentPage }); saveCurrentPage(); };
      note.oninput = () => { socket.emit('sticky-edit', { id: note.dataset.id, left: note.style.left, top: note.style.top, text: note.innerText, page: currentPage }); saveCurrentPage(); };
      stickyNotes.appendChild(note);
    });
  }
}
function addPage() {
  saveCurrentPage();
  pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  currentPage = pages.length - 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stickyNotes.innerHTML = '';
  updatePageNav();
  // Inform others to add a page and navigate to it
  socket.emit('page-add', { page: currentPage, total: pages.length });
  socket.emit('page-change', { page: currentPage });
}
function gotoPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  saveCurrentPage();
  currentPage = idx;
  loadPage(currentPage);
  updatePageNav();
  socket.emit('page-change', { page: currentPage });
}
socket.on('page-change', data => {
  // Ensure local pages array is large enough
  while (pages.length <= data.page) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (currentPage !== data.page) {
    saveCurrentPage();
    currentPage = data.page;
    loadPage(currentPage);
    updatePageNav();
  }
});
// Navigation UI
const pageNav = document.createElement('div');
pageNav.id = 'pageNav';
pageNav.style.display = 'flex';
pageNav.style.justifyContent = 'flex-start';
pageNav.style.alignItems = 'center';
pageNav.style.gap = '12px';
pageNav.style.margin = '12px 0';
const prevBtn = document.createElement('button');
prevBtn.textContent = '⟨ Prev';
const nextBtn = document.createElement('button');
nextBtn.textContent = 'Next ⟩';
const addBtn = document.createElement('button');
addBtn.textContent = '+ Add Page';
const pageLabel = document.createElement('span');
pageNav.append(prevBtn, pageLabel, nextBtn, addBtn);
document.getElementById('appLogo').after(pageNav);

// --- Page Add Sync ---
socket.on('page-add', data => {
  // Expand pages up to reported total or at least target index
  const targetLen = Math.max(pages.length, (typeof data.total === 'number' ? data.total : pages.length), (typeof data.page === 'number' ? data.page + 1 : pages.length));
  while (pages.length < targetLen) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  updatePageNav();
});

// --- Add Lock Image Button to PageNav ---
let lockBtn = document.createElement('button');
lockBtn.id = 'imageLockBtn';
lockBtn.textContent = 'Lock Image';
lockBtn.style.background = '#6366f1';
lockBtn.style.color = '#fff';
lockBtn.style.border = 'none';
lockBtn.style.borderRadius = '8px';
lockBtn.style.padding = '8px 16px';
lockBtn.style.fontWeight = 'bold';
lockBtn.style.cursor = 'pointer';
lockBtn.style.display = 'none';
lockBtn.style.marginRight = '8px';
lockBtn.onclick = () => {
  if (lockedImage) {
    lockedImage = null;
    lockBtn.textContent = 'Lock Image';
  } else if (selectedImage) {
    lockedImage = selectedImage;
    selectedImage = null;
    lockBtn.textContent = 'Unlock Image';
  }
  drawAll();
};
// Insert lockBtn before addBtn in pageNav
pageNav.insertBefore(lockBtn, addBtn);
// --- Sticky Note Delete Button in toolbar ---
let stickyDeleteBtn = document.createElement('button');
stickyDeleteBtn.id = 'stickyNoteDeleteBtn';
stickyDeleteBtn.textContent = 'Delete Note';
stickyDeleteBtn.style.background = '#ef4444';
stickyDeleteBtn.style.color = '#fff';
stickyDeleteBtn.style.border = 'none';
stickyDeleteBtn.style.borderRadius = '8px';
stickyDeleteBtn.style.padding = '8px 16px';
stickyDeleteBtn.style.fontWeight = 'bold';
stickyDeleteBtn.style.cursor = 'pointer';
stickyDeleteBtn.style.display = 'none';
stickyDeleteBtn.style.marginRight = '8px';
stickyDeleteBtn.onclick = () => {
  if (selectedStickyNote) {
    const id = selectedStickyNote.dataset.id;
    if (id) {
      socket.emit('sticky-delete', { id, page: currentPage });
    }
    selectedStickyNote.remove();
    selectedStickyNote = null;
    saveCurrentPage();
    showImageLockButton();
  }
};
// Insert delete button before Add Page
pageNav.insertBefore(stickyDeleteBtn, addBtn);

function showImageLockButton() {
  if (selectedImage || lockedImage) {
    lockBtn.style.display = '';
    lockBtn.textContent = lockedImage ? 'Unlock Image' : 'Lock Image';
  } else {
    lockBtn.style.display = 'none';
  }
  if (typeof stickyDeleteBtn !== 'undefined') {
    stickyDeleteBtn.style.display = selectedStickyNote ? '' : 'none';
  }
}

// --- Sticky Note Selection Helper ---
function setSelectedStickyNote(note) {
  const prev = selectedStickyNote;
  if (prev && prev !== note) {
    prev.classList.remove('selected');
  }
  selectedStickyNote = note || null;
  if (selectedStickyNote) {
    selectedStickyNote.classList.add('selected');
  }
  showImageLockButton();
}

// Clear selection when clicking outside notes (but not when clicking the toolbar delete button)
document.addEventListener('click', (e) => {
  if (selectedStickyNote && !selectedStickyNote.contains(e.target)) {
    if (typeof stickyDeleteBtn !== 'undefined' && (e.target === stickyDeleteBtn || (stickyDeleteBtn && stickyDeleteBtn.contains(e.target)))) {
      return; // allow toolbar delete button to act without clearing selection first
    }
    selectedStickyNote.classList.remove('selected');
    selectedStickyNote = null;
    showImageLockButton();
  }
});

function updatePageNav() {
  pageLabel.textContent = `Page ${currentPage + 1} of ${pages.length}`;
  prevBtn.style.display = pages.length > 1 ? '' : 'none';
  nextBtn.style.display = pages.length > 1 ? '' : 'none';
  addBtn.style.display = '';
}
prevBtn.onclick = () => gotoPage(currentPage - 1);
nextBtn.onclick = () => gotoPage(currentPage + 1);
addBtn.onclick = addPage;
updatePageNav();
// --- Save/Load/Export ---
saveLoadExport.onclick = () => notify('Save/Load/Export coming soon!');
// --- Invite Link ---
function updateInviteLink() {
  const base = window.location.origin + window.location.pathname;
  let params = `?room=${encodeURIComponent(roomId || '')}`;
  if (typeof roomPassword !== 'undefined' && roomPassword && roomPassword.value) {
    params += `&password=${encodeURIComponent(roomPassword.value)}`;
  }
  const newUrl = base + params;
  // Update URL without reload for easy sharing
  try { window.history.replaceState({}, '', newUrl); } catch (_) { }
}
// Call updateInviteLink after joining/creating room and after setting password
setPasswordBtn.onclick = () => {
  socket.emit('set-room-password', { roomId: roomInput.value.trim() || roomId, password: roomPassword.value });
  updateInviteLink();
};
roomPassword.addEventListener('input', updateInviteLink);
roomInput.addEventListener('input', updateInviteLink);
// --- User Roles ---
roleContainer.onclick = () => notify('User roles coming soon!');
// --- Custom Avatar/Nickname Modal ---
avatarNicknameModal.onclick = () => notify('Custom avatar/nickname coming soon!');
// --- Mobile Support ---
window.addEventListener('resize', () => {
  updateChatFabVisibility();
  // Redraw on viewport changes to keep canvas visuals intact
  resizeCanvas();
  drawAll();
});

function showHome() {
  home.classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
}
function showApp() {
  home.classList.add('hidden');
  document.getElementById('app').style.display = '';
}

function joinRoom() {
  username = usernameInput.value.trim();
  if (!username) {
    notify('Please enter your name to join.', 'error');
    usernameInput.focus();
    return;
  }
  roomId = roomInput.value.trim() || Math.random().toString(36).substr(2, 6);
  userColor = getRandomColor();
  penColor = userColor;
  colorPicker.value = userColor;
  showApp();
  resizeCanvas();
  socket.emit('join-room', { roomId, username, password: roomPassword.value });
  updateInviteLink();
}
if (joinForm) {
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    joinRoom();
  });
}

// --- Eraser Button ---
eraserBtn.onclick = () => {
  erasing = !erasing;
  eraserBtn.style.background = erasing ? 'linear-gradient(135deg, #fbbf24, #f3f4f6)' : '';
};

// --- Download as PNG ---
downloadBtn.onclick = () => {
  saveCurrentPage();
  const link = document.createElement('a');
  link.download = `whiteboard-${roomId || 'page' + (currentPage + 1)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

// --- Image Insert with Drag/Resize ---
const imageInput = document.createElement('input');
imageInput.type = 'file';
imageInput.accept = 'image/*';
imageInput.multiple = true;
imageInput.style.display = 'none';
document.body.appendChild(imageInput);
imageBtn.onclick = () => imageInput.click();
imageInput.onchange = (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function (ev) {
      const img = new window.Image();
      img.onload = function () {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 0.5);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        const newObj = { img, x, y, w, h, src: ev.target.result };
        imagesOnCanvas.push(newObj);
        selectedImage = newObj;
        lockedImage = null;
        drawAll();
        saveCurrentPage();
        socket.emit('image-add', { src: ev.target.result, x, y, w, h, page: currentPage });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  imageInput.value = '';
};

// --- Image Deletion Sync ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace' && selectedImage) {
    socket.emit('image-delete', { src: selectedImage.src, page: currentPage });
    imagesOnCanvas = imagesOnCanvas.filter(obj => obj !== selectedImage);
    selectedImage = null;
    lockedImage = null;
    drawAll();
    saveCurrentPage();
    e.preventDefault();
  }
});
socket.on('image-delete', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (pages[targetPage] && pages[targetPage].images) {
    pages[targetPage].images = pages[targetPage].images.filter(obj => obj.src !== data.src);
  }
  if (targetPage === currentPage) {
    imagesOnCanvas = imagesOnCanvas.filter(obj => obj.src !== data.src);
    drawAll();
  }
});

// --- Add Page from Toolbar ---
// Remove Pages button handler and element if present
if (typeof multiPageBtn !== 'undefined' && multiPageBtn) {
  try { multiPageBtn.remove(); } catch (_) {}
}

// --- drawAll: Redraw all images and shapes for current page ---
function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  imagesOnCanvas.forEach(obj => {
    ctx.drawImage(obj.img, obj.x, obj.y, obj.w, obj.h);
    if (selectedImage && selectedImage.img === obj.img && selectedImage.x === obj.x && selectedImage.y === obj.y) {
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(obj.x + obj.w, obj.y + obj.h, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(obj.x + obj.w - 7, obj.y + obj.h + 7);
      ctx.lineTo(obj.x + obj.w + 7, obj.y + obj.h - 7);
      ctx.stroke();
      ctx.restore();
    }
  });
  showImageLockButton();
  if (pages && pages[currentPage] && pages[currentPage].drawings) {
    pages[currentPage].drawings.forEach(line => {
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = line.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
      ctx.closePath();
      ctx.globalCompositeOperation = prevComp;
    });
  }
}

// --- Sticky Notes ---
function generateNoteId() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).substr(2, 9));
}

socket.on('sticky-add', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  // Update per-page state
  if (!pages[targetPage].notes.find(n => n.id === data.id)) {
    pages[targetPage].notes.push({ id: data.id, left: data.left, top: data.top, text: data.text });
  }
  if (targetPage !== currentPage) return;
  if (document.querySelector(`.sticky-note[data-id='${data.id}']`)) return;
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.contentEditable = true;
  note.dataset.id = data.id;
  note.style.left = data.left;
  note.style.top = data.top;
  note.innerText = data.text;
  // Attach handlers for remote-created notes as well
  note.addEventListener('touchstart', (e) => { e.stopPropagation(); setSelectedStickyNote(note); });
  note.onmousedown = (e) => {
    setSelectedStickyNote(note);
    let shiftX = e.clientX - note.offsetLeft;
    let shiftY = e.clientY - note.offsetTop;
    function moveAt(pageX, pageY) {
      note.style.left = pageX - shiftX + 'px';
      note.style.top = pageY - shiftY + 'px';
      socket.emit('sticky-move', { id: data.id, left: note.style.left, top: note.style.top, text: note.innerText, page: targetPage });
    }
    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }
    document.addEventListener('mousemove', onMouseMove);
    note.onmouseup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      note.onmouseup = null;
      saveCurrentPage();
    };
  };
  note.ondblclick = () => { note.remove(); socket.emit('sticky-delete', { id: data.id, page: targetPage }); saveCurrentPage(); };
  note.oninput = () => { socket.emit('sticky-edit', { id: data.id, left: note.style.left, top: note.style.top, text: note.innerText, page: targetPage }); saveCurrentPage(); };
  stickyNotes.appendChild(note);
  setSelectedStickyNote(note);
});
socket.on('sticky-move', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  const rec = pages[targetPage].notes.find(n => n.id === data.id);
  if (rec) { rec.left = data.left; rec.top = data.top; }
  if (targetPage !== currentPage) return;
  const note = document.querySelector(`.sticky-note[data-id='${data.id}']`);
  if (note) {
    note.style.left = data.left;
    note.style.top = data.top;
  }
});
socket.on('sticky-edit', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  const rec = pages[targetPage].notes.find(n => n.id === data.id);
  if (rec) { rec.text = data.text; }
  if (targetPage !== currentPage) return;
  const note = document.querySelector(`.sticky-note[data-id='${data.id}']`);
  if (note) {
    note.innerText = data.text;
  }
});
socket.on('sticky-delete', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  pages[targetPage].notes = pages[targetPage].notes.filter(n => n.id !== data.id);
  if (targetPage !== currentPage) return;
  const note = document.querySelector(`.sticky-note[data-id='${data.id}']`);
  if (note) note.remove();
});

// (Removed duplicate imageInput.onchange handler to prevent double insert)

// Listen for image events
socket.on('image-add', data => {
  const img = new window.Image();
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  img.onload = function () {
    const newObj = { img, x: data.x, y: data.y, w: data.w, h: data.h, src: data.src };
    // Ensure storage for target page
    while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
    if (!pages[targetPage].images) pages[targetPage].images = [];
    pages[targetPage].images.push({ src: data.src, x: data.x, y: data.y, w: data.w, h: data.h });
    if (targetPage === currentPage) {
      imagesOnCanvas.push(newObj);
      drawAll();
    }
  };
  img.src = data.src;
});

// Listen for image move/resize events
socket.on('image-move', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  // Update stored page images
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (pages[targetPage] && pages[targetPage].images) {
    const imgRec = pages[targetPage].images.find(obj => obj.src === data.src);
    if (imgRec) { imgRec.x = data.x; imgRec.y = data.y; imgRec.w = data.w; imgRec.h = data.h; }
  }
  if (targetPage === currentPage) {
    const imgObj = imagesOnCanvas.find(obj => obj.src === data.src);
    if (imgObj) { imgObj.x = data.x; imgObj.y = data.y; imgObj.w = data.w; imgObj.h = data.h; drawAll(); }
  }
});
socket.on('image-resize', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (pages[targetPage] && pages[targetPage].images) {
    const imgRec = pages[targetPage].images.find(obj => obj.src === data.src);
    if (imgRec) { imgRec.x = data.x; imgRec.y = data.y; imgRec.w = data.w; imgRec.h = data.h; }
  }
  if (targetPage === currentPage) {
    const imgObj = imagesOnCanvas.find(obj => obj.src === data.src);
    if (imgObj) { imgObj.x = data.x; imgObj.y = data.y; imgObj.w = data.w; imgObj.h = data.h; drawAll(); }
  }
});

if (copyInviteBtn) {
  copyInviteBtn.onclick = async () => {
    const base = window.location.origin + window.location.pathname;
    let params = `?room=${encodeURIComponent(roomId || '')}`;
    if (typeof roomPassword !== 'undefined' && roomPassword && roomPassword.value) {
      params += `&password=${encodeURIComponent(roomPassword.value)}`;
    }
    const linkToCopy = base + params;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      copyInviteBtn.textContent = '✅';
    } catch (e) {
      // Fallback
      const tmp = document.createElement('textarea');
      tmp.value = linkToCopy;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      copyInviteBtn.textContent = '✅';
    }
    setTimeout(() => { copyInviteBtn.textContent = '🔗'; }, 1000);
  };
}

// --- Auto-fill room and password from URL for invite links ---
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  const password = params.get('password');
  if (room) roomInput.value = room;
  if (password && typeof roomPassword !== 'undefined' && roomPassword) roomPassword.value = password;
  const rpc = document.getElementById('roomPasswordContainer');
  if (rpc) rpc.style.display = (roomPassword && roomPassword.value) ? '' : 'none';
});

// Ensure remote audio element is allowed to autoplay on supported browsers
window.addEventListener('DOMContentLoaded', () => {
  try {
    if (remoteAudio) {
      remoteAudio.autoplay = true;
      remoteAudio.playsInline = true;
      remoteAudio.muted = false;
      remoteAudio.volume = 1.0;
    }
  } catch (_) {}
});

// --- Improved Audio Constraints ---
const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2
  }
};

// --- Mic Button Logic (add/remove track only) ---
async function renegotiateAllPeers() {
  for (const [peerId, pc] of Object.entries(peerConnections)) {
    if (pc.signalingState === 'stable') {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice-offer', { to: peerId, offer });
      } catch (e) {
        console.error('Renegotiation error:', e);
      }
    }
  }
}

function stopVoiceDetection() {
  if (typeof speakingInterval !== 'undefined' && speakingInterval) clearInterval(speakingInterval);
  if (typeof audioContext !== 'undefined' && audioContext) audioContext.close();
  speakingInterval = null;
  audioContext = null;
}

micBtn.onclick = async () => {
  if (!isMicOn) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      localStream = stream;
      localAudioTrack = stream.getAudioTracks()[0];
      isMicOn = true;
      micBtn.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
      startVoiceDetection();
      // Enable audio track and add to all peer connections
      if (localAudioTrack) {
        localAudioTrack.enabled = true;
        Object.values(peerConnections).forEach(pc => {
          if (!pc.getSenders().some(s => s.track === localAudioTrack)) {
            pc.addTrack(localAudioTrack, localStream);
          }
        });
      }
      await renegotiateAllPeers();
      console.log('Mic ON, localStream:', localStream);
    } catch (err) {
      alert('Microphone access denied.');
      console.error('Mic access error:', err);
    }
  } else {
    // Disable audio track for all peer connections
    if (localAudioTrack) localAudioTrack.enabled = false;
    stopVoiceDetection();
    // Broadcast not speaking when mic turns off
    socket.emit('speaking', { roomId, username, isSpeaking: false });
    isMicOn = false;
    micBtn.style.background = '';
    micBtn.classList.remove('speaking');
    console.log('Mic OFF, localStream disabled');
  }
};

function startVoiceDetection() {
  if (!localStream) return;
  if (speakingInterval) clearInterval(speakingInterval);
  if (audioContext) try { audioContext.close(); } catch (_) { }
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(localStream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  speakingInterval = setInterval(() => {
    analyser.getByteTimeDomainData(data);
    // Compute RMS
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const isSpeakingNow = rms > 0.07; // threshold
    micBtn.classList.toggle('speaking', isSpeakingNow);
    socket.emit('speaking', { roomId, username, isSpeaking: isSpeakingNow });
  }, 300);
}

// --- Peer Connection Logic ---
function createPeerConnection(peerId, isInitiator) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  });
  peerConnections[peerId] = pc;
  // Always add audio track if it exists and is enabled
  if (localAudioTrack && localAudioTrack.enabled && localStream) {
    pc.addTrack(localAudioTrack, localStream);
  }
  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('voice-ice', { to: peerId, candidate: event.candidate });
    }
  };
  pc.ontrack = event => {
    if (event.streams && event.streams[0]) {
      // Get or create per-peer audio element and play
      let el = remoteAudioEls[peerId];
      if (!el) {
        // Prefer the single built-in element for the first peer
        if (remoteAudio && !remoteAudio.dataset.assigned) {
          el = remoteAudio;
          remoteAudio.dataset.assigned = '1';
        } else {
          el = document.createElement('audio');
          el.style.display = 'none';
          document.body.appendChild(el);
        }
        el.autoplay = true;
        el.playsInline = true;
        el.muted = false;
        el.volume = 1.0;
        remoteAudioEls[peerId] = el;
      }
      el.srcObject = event.streams[0];
      const tryPlay = () => {
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Autoplay might be blocked; retry on next user gesture
            const resume = () => {
              el.play().finally(() => document.removeEventListener('click', resume));
            };
            document.addEventListener('click', resume, { once: true });
          });
        }
      };
      if (el.readyState >= 2) tryPlay();
      else el.onloadedmetadata = tryPlay;
    }
  };
  if (isInitiator) {
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice-offer', { to: peerId, offer });
    };
  }
}

// --- Debug logs and error handling for user list ---
function updateUserList(users) {
  try {
    userList.innerHTML = '';
    users.forEach(u => {
      if (!userColors[u.name]) userColors[u.name] = u.color || getRandomColor();
      const li = document.createElement('li');
      const isSpeaking = speakingUsers.has(u.name);
      li.innerHTML = `<span class="user-avatar${u.drawing ? ' user-drawing' : ''}" style="background:${userColors[u.name]}">${isSpeaking ? '<span class=\'user-dot speaking\'></span>' : '<span class=\'user-dot\'></span>'}</span>${u.name}`;
      userList.appendChild(li);
    });
    // Quiet in production: no noisy logs
  } catch (err) {
    console.error('Error updating user list:', err, users);
  }
}

// --- WebRTC Voice Chat Signaling ---
socket.on('voice-users', users => {
  users.forEach(user => {
    if (user !== socket.id && !peerConnections[user]) {
      createPeerConnection(user, true);
    }
  });
  // Remove peer connections for users who left
  Object.keys(peerConnections).forEach(id => {
    if (!users.includes(id)) {
      try { peerConnections[id].close(); } catch (e) { }
      delete peerConnections[id];
      // Also clean up any associated audio element
      const el = remoteAudioEls[id];
      if (el) {
        try {
          el.srcObject = null;
          if (el !== remoteAudio) el.remove();
        } catch (_) {}
        if (el === remoteAudio && remoteAudio.dataset.assigned) delete remoteAudio.dataset.assigned;
        delete remoteAudioEls[id];
      }
    }
  });
});

// Speaking users broadcast -> update set and refresh UI
socket.on('speaking-users', (names) => {
  speakingUsers = new Set(names || []);
  // Request latest user list refresh by triggering updateUserList on current list if available
  // This assumes we keep last known list in closure; if not, rely on server 'user-list' events.
  // For immediate UI feedback, we can rebuild using existing DOM names:
  const currentUsers = Array.from(userList.querySelectorAll('li')).map(li => {
    const name = li.textContent;
    return { name, color: userColors[name] || getRandomColor(), drawing: li.querySelector('.user-drawing') != null };
  });
  if (currentUsers.length) updateUserList(currentUsers);
});

// Password events
socket.on('password-incorrect', () => {
  notify('Incorrect room password.', 'error');
  showHome();
});
socket.on('password-set', (data) => {
  if (data && data.success) {
    notify('Room password set.', 'success');
  }
});

socket.on('voice-offer', async ({ from, offer }) => {
  if (!peerConnections[from]) createPeerConnection(from, false);
  await peerConnections[from].setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnections[from].createAnswer();
  await peerConnections[from].setLocalDescription(answer);
  socket.emit('voice-answer', { to: from, answer });
});

socket.on('voice-answer', async ({ from, answer }) => {
  if (peerConnections[from]) {
    await peerConnections[from].setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on('voice-ice', ({ from, candidate }) => {
  if (peerConnections[from]) {
    peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// --- Notifications (UI) ---
function notify(msg, type = 'info') {
  try {
    const container = document.getElementById('notificationContainer');
    if (!container) { console.log('NOTIFY:', msg); return; }
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease, transform 200ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      setTimeout(() => el.remove(), 300);
    }, 1800);
  } catch (e) {
    console.log('NOTIFY:', msg);
  }
}