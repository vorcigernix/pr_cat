import React from "react"
import Link from "next/link"
import { IconBrandGithub } from "@tabler/icons-react"
import { PrcatLogo } from "@/components/ui/prcat-logo"

const FOOTER_LINKS = {
  product: [
    { href: "#features", label: "Features" },
    { href: "#why-metrics-matter", label: "Why Metrics Matter" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/help", label: "Documentation" },
  ],
  community: [
    { 
      href: "https://github.com/vorcigernix/pr_cat", 
      label: "GitHub Repository", 
      external: true 
    },
    { 
      href: "https://github.com/vorcigernix/pr_cat/issues", 
      label: "Report Issues", 
      external: true 
    },
    { 
      href: "https://github.com/vorcigernix/pr_cat/blob/main/CONTRIBUTING.md", 
      label: "Contributing", 
      external: true 
    },
    { 
      href: "https://github.com/vorcigernix/pr_cat/discussions", 
      label: "Discussions", 
      external: true 
    },
  ]
}

export function Footer() {
  return (
    <footer className="border-t py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand and Description */}
          <div className="space-y-4">
            <div className="flex items-center">
              <PrcatLogo className="mr-2" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Open source GitHub PR analytics for engineering teams. Transform development metrics into strategic insights.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconBrandGithub className="h-4 w-4" />
              <span>MIT Licensed • Open Source</span>
            </div>
          </div>
          
          {/* Links */}
          <div className="grid gap-6 sm:grid-cols-2 md:col-span-2">
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <div className="space-y-2 text-sm">
                {FOOTER_LINKS.product.map(({ href, label }) => (
                  <Link 
                    key={label}
                    href={href} 
                    className="text-muted-foreground hover:text-foreground block"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Community</h4>
              <div className="space-y-2 text-sm">
                {FOOTER_LINKS.community.map(({ href, label, external }) => (
                  <Link 
                    key={label}
                    href={href} 
                    {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                    className="text-muted-foreground hover:text-foreground block"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <span className="text-sm text-muted-foreground mb-4 md:mb-0">
            © 2024 PR Cat. MIT Licensed.
          </span>
          <div className="flex gap-6">
            <Link 
              href="https://github.com/vorcigernix/pr_cat" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Source Code
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
} 