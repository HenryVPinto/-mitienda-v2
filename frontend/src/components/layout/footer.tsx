import Link from "next/link"
import Image from "next/image"
import { storeGet } from "@/lib/medusa"
import type { CmsPage } from "@/lib/types"

async function getFooterPages() {
  try {
    const data = await storeGet<{ pages: CmsPage[] }>("/store/cms/pages")
    return data.pages.filter((p) => p.is_published)
  } catch {
    return []
  }
}

export async function Footer() {
  const pages = await getFooterPages()
  const fbUrl = process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK
  const igUrl = process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM
  const ytUrl = process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE

  return (
    <footer className="bg-gray-800 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Marca */}
        <div>
          <Image
            src="/logo.png"
            alt="MiTienda"
            width={120}
            height={36}
            className="h-9 w-auto object-contain brightness-0 invert mb-4"
          />
          <p className="text-sm leading-relaxed text-gray-400">
            Tu marketplace de confianza en Guatemala. Encuentra todo lo que necesitas con los mejores emprendedores del país.
          </p>
          {(fbUrl || igUrl || ytUrl) && (
            <div className="flex items-center gap-3 mt-4">
              {fbUrl && (
                <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.89h-2.33v6.987C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
              )}
              {igUrl && (
                <a href={igUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              )}
              {ytUrl && (
                <a href={ytUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 01-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 01-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 011.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418zM15.194 12 10 15V9l5.194 3z" clipRule="evenodd" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Servicio al cliente */}
        <div>
          <h3 className="text-white font-semibold mb-4">Servicio al Cliente</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/faq" className="hover:text-white transition-colors">Preguntas frecuentes</Link></li>
            <li><Link href="/envios" className="hover:text-white transition-colors">Envíos y entregas</Link></li>
            <li><Link href="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
            <li><Link href="/metodos-de-pago" className="hover:text-white transition-colors">Métodos de pago</Link></li>
          </ul>
        </div>

        {/* MiTienda */}
        <div>
          <h3 className="text-white font-semibold mb-4">MiTienda</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/aviso-legal" className="hover:text-white transition-colors">Aviso Legal</Link></li>
            {pages.map((page) => (
              <li key={page.id}>
                <Link href={`/${page.slug}`} className="hover:text-white transition-colors">
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Vende en MiTienda */}
        <div>
          <h3 className="text-white font-semibold mb-4">Vende en MiTienda</h3>
          <p className="text-sm text-gray-400 mb-4">
            Únete a nuestra comunidad de emprendedores y lleva tu negocio al siguiente nivel.
          </p>
          <Link
            href="/vende"
            className="inline-block bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Quiero vender
          </Link>
          <p className="mt-3 text-xs text-gray-500">
            <Link href="/emprendedores" className="hover:text-white">¿Eres emprendedor? Inicia sesión</Link>
          </p>
        </div>
      </div>

      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} MiTienda. Todos los derechos reservados.</span>
          <span>
            Desarrollado por{" "}
            <a
              href="https://www.innovate.gt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors font-medium"
            >
              Innovate
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
