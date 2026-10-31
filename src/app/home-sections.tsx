import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { SiteFooter } from './site-footer'

const stories = [
  { title: 'Como funciona a propriedade de NFTs', image: '/artwork/neon-vessel.webp', date: '12 de setembro', readingTime: 6, description: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { title: '10 artistas digitais para acompanhar', image: '/artwork/emerald-ape.webp', date: '13 de setembro', readingTime: 2, description: 'Conheça criadores que moldam a cultura digital.' },
  { title: 'Raridade, atributos e procedência', image: '/artwork/cosmic-bloom.webp', date: '15 de setembro', readingTime: 3, description: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { title: 'Como proteger sua carteira', image: '/artwork/golden-beat.webp', date: '15 de setembro', readingTime: 2, description: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

const highlights = [
  { nftId: 'emerald-ape-042', image: '/artwork/emerald-ape.webp', alt: 'Emerald Ape', title: 'Lançamentos gênesis de edição limitada', description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.' },
  { nftId: 'neon-vessel-552', image: '/artwork/neon-vessel.webp', alt: 'Neon Vessel', title: 'Arte digital selecionada e muito mais', description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cena.' },
]

const stripGap = 16

export function HomeSections() {
  return <>
    <section id="destaques" aria-label="Destaques da coleção" className="mt-12 flex scroll-mt-8 flex-col gap-4 px-6 md:mx-auto md:mt-24 md:grid md:max-w-[1200px] md:gap-6 md:px-8 lg:grid-cols-2 lg:gap-7 xl:px-0">
      {highlights.map((highlight) => <article key={highlight.nftId} className="flex items-center gap-3 overflow-hidden rounded-[20px] bg-[#241612] p-3 md:grid md:w-auto md:grid-cols-2 md:items-stretch md:gap-0 md:rounded-lg md:bg-[#2a1a15] md:p-0 lg:h-[250px] lg:grid-cols-[292px_minmax(0,1fr)]">
        <img src={highlight.image} alt={highlight.alt} loading="lazy" width="292" height="250" className="size-24 shrink-0 rounded-[16px] object-cover md:aspect-square md:h-full md:w-full md:rounded-[18px] lg:aspect-auto lg:h-[250px]" />
        <div className="flex min-w-0 flex-col items-start gap-1 text-left md:items-end md:justify-center md:gap-0 md:p-6 md:text-right">
          <h2 className="line-clamp-3 text-sm font-bold leading-[18px] md:line-clamp-none md:text-lg md:leading-7">{highlight.title}</h2>
          <p className="line-clamp-2 text-xs leading-4 text-[#cfb28c] md:mt-3 md:line-clamp-none md:leading-5">{highlight.description}</p>
          <Button asChild size="sm" className="mt-2 md:mt-4"><Link to="/nft/$nftId" params={{ nftId: highlight.nftId }}>Explorar <ArrowRight size={14} /></Link></Button>
        </div>
      </article>)}
    </section>

    <section id="diario" aria-labelledby="journal-title" className="mx-auto mt-14 max-w-[1200px] scroll-mt-8 md:mt-24 md:px-8 xl:px-0">
      <div className="flex flex-col items-start gap-2 px-6 md:items-center md:gap-3 md:px-0">
        <h2 id="journal-title" className="text-[20px] font-bold leading-6 md:text-center md:text-[28px] md:leading-[37px]">Diário da Cunhagem</h2>
        <p className="text-xs leading-[18px] text-[#cfb28c] md:text-center md:text-sm">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <JournalCarousel />
    </section>

    <SiteFooter />
  </>
}

// no mobile os artigos são um carrossel com pontos; a partir de md voltam a ser a grade do desktop
function JournalCarousel() {
  const stripRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // o artigo ativo é o que está encostado na borda esquerda da faixa
  const syncActive = () => {
    const strip = stripRef.current
    const card = strip?.firstElementChild as HTMLElement | null
    if (!strip || !card) return
    const next = Math.round(strip.scrollLeft / (card.offsetWidth + stripGap))
    setActive((current) => (current === next ? current : next))
  }

  // rola só a faixa: scrollIntoView também mexeria na página quando o card não está inteiro na tela
  const goTo = (index: number) => {
    const strip = stripRef.current
    const card = strip?.firstElementChild as HTMLElement | null
    if (!strip || !card) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    strip.scrollTo({ left: index * (card.offsetWidth + stripGap), behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return <>
    <div ref={stripRef} onScroll={syncActive} className="mt-5 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 [scrollbar-width:none] md:mt-10 md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
      {/* fora do escopo: o card mantém o desenho, sem hover e sem link, como o login social;
          relative prende o sr-only dentro da faixa, senão ele alarga a página */}
      {stories.map((story) => <article key={story.title} className="relative flex h-[350px] w-[calc(100vw-48px)] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] bg-[#241612] md:h-[369px] md:w-auto md:rounded-lg">
        <img src={story.image} alt="" loading="lazy" width="268" height="195" className="h-[180px] w-full object-cover md:h-[195px]" />
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4 pt-3">
          <p className="h-8 text-xs font-medium leading-4 text-[#cfb28c]">{story.date} <span aria-hidden="true">|</span> Leitura de {story.readingTime} min</p>
          <h3 className="line-clamp-2 min-h-[42px] text-base font-bold leading-[21px]">{story.title}</h3>
          <p className="line-clamp-2 text-xs leading-4 text-[#cfb28c]">{story.description}</p>
          <span aria-disabled="true" className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-bold leading-[14px] text-[#e89b55]">Ler mais <span aria-hidden="true">→</span><span className="sr-only"> (fora do escopo desta entrega)</span></span>
        </div>
      </article>)}
    </div>
    <div className="mt-5 flex items-center justify-center gap-2 md:hidden">
      {stories.map((story, index) => <button key={story.title} type="button" aria-label={`Ver artigo ${index + 1} de ${stories.length}`} aria-current={index === active} onClick={() => goTo(index)} className={`size-3 cursor-pointer rounded-full border-[1.3px] border-[#d28a4c] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] ${index === active ? 'bg-[#d28a4c]' : 'bg-transparent hover:bg-[#d28a4c]/40'}`} />)}
    </div>
  </>
}
