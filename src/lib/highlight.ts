import { ref } from 'vue'

export function useHighlight() {
  const ids = ref<number[]>([])

  function flash(id: number): void {
    ids.value = [...ids.value.filter((item) => item !== id), id]
    window.setTimeout(() => {
      ids.value = ids.value.filter((item) => item !== id)
    }, 750)
  }

  function has(id: number): boolean {
    return ids.value.includes(id)
  }

  return { flash, has }
}
