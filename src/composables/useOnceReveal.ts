import { nextTick, onMounted, onUnmounted, type Ref } from 'vue'

export function useOnceReveal(root: Ref<HTMLElement | null>): void {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    void nextTick(() => {
      const nodes = Array.from(root.value?.querySelectorAll<HTMLElement>('[data-reveal]') ?? [])

      if (reduce) {
        nodes.forEach((node) => node.classList.add('is-visible'))
        return
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue
            }

            entry.target.classList.add('is-visible')
            observer?.unobserve(entry.target)
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      )

      for (const node of nodes) {
        const rect = node.getBoundingClientRect()

        if (rect.top < window.innerHeight * 0.92) {
          node.classList.add('is-visible')
        } else {
          node.classList.add('pub-pending')
          observer.observe(node)
        }
      }
    })
  })

  onUnmounted(() => observer?.disconnect())
}
