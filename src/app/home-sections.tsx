import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { SiteFooter } from './site-footer'

const stories = [
  { title: 'Como funciona a propriedade de NFTs', image: '/artwork/neon-vessel.webp', date: '12 de setembro', readingTime: 6, description: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { title: '10 artistas digitais para acompanhar', image: '/artwork/emerald-ape.webp', date: '13 de setembro', readingTime: 2, description: 'Conheça criadores que moldam a cultura digital.' },
  { title: 'Raridade, atributos e procedência', image: '/artwork/cosmic-bloom.webp', date: '15 de setembro', readingTime: 3, description: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { title: 'Como proteger sua carteira', image: '/artwork/golden-beat.webp', date: '15 de setembro', readingTime: 2, description: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function HomeSections() {
  return <>
    <section id="destaques" aria-label="Destaques da coleção" className="mx-auto mt-24 grid max-w-[1200px] scroll-mt-8 gap-6 px-5 sm:px-8 lg:grid-cols-2 lg:gap-7 xl:px-0">
      <article className="grid overflow-hidden rounded-lg bg-[#2a1a15] sm:grid-cols-2 lg:h-[250px] lg:grid-cols-[292px_minmax(0,1fr)]">
        <img src="/artwork/emerald-ape.webp" alt="Emerald Ape" loading="lazy" width="292" height="250" className="aspect-square h-full w-full rounded-[18px] object-cover lg:aspect-auto lg:h-[250px]" />
        <div className="flex flex-col items-end justify-center p-6 text-right"><h2 className="text-lg font-bold">Lançamentos gênesis de edição limitada</h2><p className="mt-3 text-xs leading-5 text-[#cfb28c]">Colecione edições escassas diretamente dos criadores antes da revelação pública.</p><Button asChild size="sm" className="mt-4"><Link to="/nft/$nftId" params={{ nftId: 'emerald-ape-042' }}>Explorar <ArrowRight size={14} /></Link></Button></div>
      </article>
      <article className="grid overflow-hidden rounded-lg bg-[#2a1a15] sm:grid-cols-2 lg:h-[250px] lg:grid-cols-[292px_minmax(0,1fr)]">
        <img src="/artwork/neon-vessel.webp" alt="Neon Vessel" loading="lazy" width="292" height="250" className="aspect-square h-full w-full rounded-[18px] object-cover lg:aspect-auto lg:h-[250px]" />
        <div className="flex flex-col items-end justify-center p-6 text-right"><h2 className="text-lg font-bold">Arte digital selecionada e muito mais</h2><p className="mt-3 text-xs leading-5 text-[#cfb28c]">Explore novos artistas, coleções verificadas e obras digitais que definem a cena.</p><Button asChild size="sm" className="mt-4"><Link to="/nft/$nftId" params={{ nftId: 'neon-vessel-552' }}>Explorar <ArrowRight size={14} /></Link></Button></div>
      </article>
    </section>

    <section id="diario" aria-labelledby="journal-title" className="mx-auto mt-24 scroll-mt-8 max-w-[1200px] px-5 sm:px-8 xl:px-0">
      <div className="flex flex-col items-center gap-3">
        <h2 id="journal-title" className="text-center text-[28px] font-bold leading-[37px]">Diário da Cunhagem</h2>
        <p className="text-center text-sm leading-[18px] text-[#cfb28c]">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stories.map((story) => <article key={story.title} className="group flex h-[369px] flex-col overflow-hidden rounded-lg bg-[#241612] transition-colors hover:bg-[#302019]"><img src={story.image} alt="" loading="lazy" width="268" height="195" className="h-[195px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" /><div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4 pt-3"><p className="h-8 text-xs font-medium leading-4 text-[#cfb28c]">{story.date} <span aria-hidden="true">|</span> Leitura de {story.readingTime} min</p><h3 className="line-clamp-2 min-h-[42px] text-base font-bold leading-[21px] transition-colors group-hover:text-[#e89b55]">{story.title}</h3><p className="line-clamp-2 text-xs leading-4 text-[#cfb28c]">{story.description}</p><a href="#diario" className="mt-auto inline-flex w-fit cursor-pointer items-center gap-1 text-xs font-bold leading-[14px] text-[#e89b55] transition-colors hover:text-[#f5b477] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Ler mais <span aria-hidden="true">→</span></a></div></article>)}
      </div>
    </section>

    <SiteFooter />
  </>
}
