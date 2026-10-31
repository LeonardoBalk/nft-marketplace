import { useState } from 'react'
import { Button } from '../components/ui/button'

const socialIcons = [
  { name: 'Facebook', width: 8, height: 16, svg: <svg viewBox="0 0 8 16" width="8" height="16" aria-hidden="true"><path fill="currentColor" d="M5.2 16V8.7h2.4L8 5.9H5.2V4.2c0-.8.3-1.4 1.5-1.4H8V.2C7.4.1 6.6 0 5.5 0 3.2 0 1.7 1.4 1.7 4v1.9H0v2.8h1.7V16z" /></svg> },
  { name: 'Instagram', width: 16, height: 16, svg: <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="3.2" stroke="currentColor" strokeWidth="1.8" /><circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.8" /><circle cx="11.8" cy="4.3" r="1" fill="currentColor" /></svg> },
  { name: 'Twitter', width: 16, height: 13, svg: <svg viewBox="0 0 24 20" width="16" height="13" aria-hidden="true"><path fill="currentColor" d="M23.5 2.4a9.7 9.7 0 0 1-2.8.8A4.9 4.9 0 0 0 22.9.5a9.8 9.8 0 0 1-3.1 1.2A4.9 4.9 0 0 0 11.4 6a13.9 13.9 0 0 1-10-5.1 4.9 4.9 0 0 0 1.5 6.6 4.8 4.8 0 0 1-2.2-.6v.1a4.9 4.9 0 0 0 3.9 4.8 4.9 4.9 0 0 1-2.2.1 4.9 4.9 0 0 0 4.6 3.4A9.9 9.9 0 0 1 0 17.3 14 14 0 0 0 7.5 19.5c9.1 0 14-7.5 14-14v-.6a10 10 0 0 0 2-2.5" /></svg> },
  { name: 'LinkedIn', width: 16, height: 15.33, svg: <svg viewBox="0 0 24 24" width="16" height="15.33" aria-hidden="true"><path fill="currentColor" d="M5.3 3.7a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0ZM1 8h4v15H1zm6.5 0h3.8v2.1h.1c.5-1 1.8-2.4 4.1-2.4 4.4 0 5.2 2.9 5.2 6.7V23h-4v-7.6c0-1.8 0-4.1-2.5-4.1s-2.8 1.9-2.8 4V23h-4z" /></svg> },
  { name: 'YouTube', width: 18.67, height: 13.98, svg: <svg viewBox="0 0 24 18" width="18.67" height="13.98" aria-hidden="true"><path fill="currentColor" d="M23.5 3.1a3 3 0 0 0-2.1-2.2C19.5.4 12 .4 12 .4s-7.5 0-9.4.5A3 3 0 0 0 .5 3.1 31 31 0 0 0 0 9s0 3.2.5 5.9a3 3 0 0 0 2.1 2.2c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.2A31 31 0 0 0 24 9s0-3.2-.5-5.9Z"/><path fill="#241612" d="m9.6 12.7 6.3-3.7-6.3-3.7z"/></svg> },
]


export function SiteFooter() {
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false)

  return <footer className="mx-auto mt-24 max-w-[1200px] px-5 sm:px-8 lg:px-0">
  <div className="grid gap-8 bg-[#241612] p-8 sm:grid-cols-2 lg:h-[250px] lg:grid-cols-[repeat(3,minmax(0,1fr))_357px] lg:gap-0">
    {[
      { mark: 'W', title: 'Segurança da carteira', description: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
      { mark: 'C', title: 'Criadores em destaque', description: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
      { mark: 'D', title: 'Alertas de lançamentos', description: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
    ].map((feature) => <article key={feature.mark} className="flex flex-col gap-3 px-4 lg:h-[202px] lg:border-r lg:border-[#d28a4c]">
      <span className="flex size-[74px] items-center justify-center rounded-full bg-[#d28a4c] text-2xl font-bold leading-8 text-[#140d0a]">{feature.mark}</span>
      <h2 className="text-[17px] font-bold leading-4">{feature.title}</h2>
      <p className="max-w-[204px] text-[14px] leading-[22px] text-[#cfb28c]">{feature.description}</p>
    </article>)}
    <div className="flex flex-col gap-3 px-4 lg:h-[202px] lg:justify-center">
      <h2 className="max-w-[325px] text-lg font-bold leading-4">Antecipe-se ao próximo lançamento</h2>
      <form className="flex h-10 w-full max-w-[325px] overflow-hidden rounded-md bg-[#38220f] shadow-[0_0_20px_rgba(10,6,4,0.45)]" onSubmit={(event) => { event.preventDefault(); setNewsletterSubmitted(true) }}>
        <label className="sr-only" htmlFor="newsletter-email">Seu e-mail</label>
        <input id="newsletter-email" type="email" required placeholder="digite seu e-mail..." className="min-w-0 flex-1 bg-transparent pl-3 text-sm text-[#f5f1eb] placeholder:text-[#b39463] focus-visible:outline-2 focus-visible:outline-[#d99558]" />
        <Button type="submit" className="h-10 w-[85px] min-h-0 flex-none gap-0 rounded-l-none rounded-r-md bg-[#d28a4c] px-0 text-lg font-bold text-[#140d0a] hover:bg-[#e39a5f]">{newsletterSubmitted ? 'Enviado' : 'Enviar'}</Button>
      </form>
      <p role={newsletterSubmitted ? 'status' : undefined} className="max-w-[325px] text-[13px] leading-[22px] text-[#cfb28c]">{newsletterSubmitted ? 'Inscrição realizada.' : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}</p>
    </div>
  </div>
  <div className="flex flex-col gap-5 bg-[#38220f] px-8 py-6 sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center sm:gap-0 lg:flex lg:h-[88px] lg:flex-row lg:justify-between lg:py-0">
    <strong className="w-[210px] text-sm tracking-[0.1em]">KURIO</strong>
    <span className="w-[210px] text-sm leading-[22px]"><span className="whitespace-nowrap">Feito para colecionadores,</span><br /><span className="whitespace-nowrap">criadores e cultura</span></span>
    <a href="mailto:contato@email.com" className="w-[210px] text-sm leading-[22px] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">contato@email.com</a>
    <a href="tel:+551140028922" className="w-[228px] text-sm leading-[22px] transition-colors hover:text-[#e89b55] focus-visible:outline-2 focus-visible:outline-[#d28a4c]">+55 11 4002 8922</a>
  </div>
  <div className="flex flex-col gap-8 bg-[#241612] px-8 py-8 sm:grid sm:grid-cols-2 lg:flex lg:h-[236px] lg:flex-row lg:items-start lg:justify-between">
    <div className="flex flex-col gap-2 lg:w-[178.67px]">
      <h2 className="text-lg font-bold leading-4">Meu perfil</h2>
      <ul className="text-sm leading-[30px]"><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Meu perfil</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Minha coleção</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Atividade</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Estúdio do criador</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Lista de interesse</li></ul>
    </div>
    <div className="flex flex-col gap-2 lg:w-[178.67px]">
      <h2 className="text-lg font-bold leading-4">Central de ajuda</h2>
      <ul className="text-sm leading-[30px]"><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Central de ajuda</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Como comprar NFTs</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Carteira e segurança</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Política do mercado</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Denunciar item</li></ul>
    </div>
    <div className="flex flex-col gap-2 lg:w-[178.67px]">
      <h2 className="text-lg font-bold leading-4">Coleções</h2>
      <ul className="text-sm leading-[30px]"><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Arte digital</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Fotografia</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Música</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Arte 3D</li><li className="cursor-pointer transition-colors hover:text-[#e89b55]">Utilidade</li></ul>
    </div>
    <div className="flex flex-col gap-8 lg:w-[228px]">
      <div className="flex w-[190px] flex-col gap-5">
        <h2 className="h-4 text-lg font-bold leading-4">Redes sociais</h2>
        <div className="flex h-[30px] w-[190px] items-center gap-[10px]" role="group" aria-label="Redes sociais">
          {socialIcons.map((social) => <span key={social.name} role="img" aria-label={social.name} className="flex size-[30px] cursor-pointer items-center justify-center rounded border border-[#d28a4c] text-[#d28a4c] transition-all hover:scale-105 hover:border-[#e89b55] hover:bg-[#38220f] hover:text-[#e89b55]">{social.svg}</span>)}
        </div>
      </div>
      <div className="flex w-[228px] flex-col gap-3">
        <h2 className="h-4 text-lg font-bold leading-4">Carteiras compatíveis</h2>
        <div className="flex h-[26px] w-[228px] items-center justify-center gap-[10px] whitespace-nowrap rounded-md border border-[#55321f] bg-[#38220f] pl-2 text-[9px] font-bold leading-3 tracking-[0.1px] text-[#e89b55]">
          <span>METAMASK</span><span aria-hidden="true">•</span><span>WALLETCONNECT</span><span aria-hidden="true">•</span><span>COINBASE</span>
        </div>
      </div>
    </div>
  </div>
  <p className="mt-[6px] h-[30px] text-center text-sm leading-[30px] text-[#f5f1eb]">© 2026 Kurio. Propriedade digital para todos.</p>
</footer>
}
