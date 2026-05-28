<script setup></script>

<template>
  <div class="app-shell">
    <div class="blob blob-1" aria-hidden="true"></div>
    <div class="blob blob-2" aria-hidden="true"></div>
    <RouterView />
  </div>
</template>

<style>
.app-shell {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}

.blob-1 {
  width: 600px;
  height: 600px;
  background: rgba(203, 187, 160, 0.03);
  top: -200px;
  right: -150px;
}

.blob-2 {
  width: 500px;
  height: 500px;
  background: rgba(203, 187, 160, 0.025);
  bottom: -150px;
  left: -100px;
}
</style>
