<template>
  <main class="mx-auto max-w-screen-sm p-4">
    <h1 class="title text-primary text-2xl font-bold">Batucad</h1>
  </main>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.title {
  @include truncate;
}
</style>
