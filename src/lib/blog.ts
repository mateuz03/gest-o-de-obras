import { BLOG_POSTS, type BlogPostData } from "@/data/blogData";
import type { Database } from "@/integrations/supabase/types";

type BlogRow = Database["public"]["Tables"]["blog_posts"]["Row"];

export interface PublicBlogPost {
  id: number;
  slug: string;
  categoria: string;
  tipo: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  autor: string;
  data: string;
  tempoLeitura: string;
  destaque: boolean;
  imagem: string;
}

export const FALLBACK_BLOG_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23f1f5f9'/%3E%3Crect x='340' y='160' width='120' height='80' rx='8' fill='%23cbd5e1'/%3E%3Ccircle cx='400' cy='145' r='20' fill='%23cbd5e1'/%3E%3C/svg%3E";

export function formatBlogDate(value?: string | null) {
  if (!value) return new Date().toLocaleDateString("pt-BR");

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function mapBlogRowToPublicPost(row: BlogRow): PublicBlogPost {
  return {
    id: row.id,
    slug: row.slug,
    categoria: row.categoria,
    tipo: row.tipo,
    titulo: row.titulo,
    resumo: row.resumo,
    conteudo: row.conteudo,
    autor: row.autor,
    data: formatBlogDate(row.created_at),
    tempoLeitura: row.tempo_leitura || "5 min",
    destaque: Boolean(row.destaque),
    imagem: row.imagem || FALLBACK_BLOG_IMAGE,
  };
}

export function mapMockBlogPostToPublicPost(post: BlogPostData): PublicBlogPost {
  return {
    id: post.id,
    slug: post.slug,
    categoria: post.categoria,
    tipo: post.tipo,
    titulo: post.titulo,
    resumo: post.resumo,
    conteudo: post.conteudo,
    autor: post.autor,
    data: post.data,
    tempoLeitura: post.tempoLeitura,
    destaque: post.destaque,
    imagem: post.imagem || FALLBACK_BLOG_IMAGE,
  };
}

export function getMockBlogPosts() {
  return BLOG_POSTS.map(mapMockBlogPostToPublicPost);
}

export function sanitizeBlogHtml(input: string) {
  if (!input) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return input;
  }

  const allowedTags = new Set([
    "a",
    "blockquote",
    "br",
    "em",
    "h2",
    "h3",
    "li",
    "ol",
    "p",
    "strong",
    "ul",
  ]);

  const allowedAttributes: Record<string, Set<string>> = {
    a: new Set(["href", "target", "rel"]),
  };

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  if (!root) return "";

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (!allowedTags.has(tagName)) {
        const parent = element.parentNode;
        if (parent) {
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        }
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const attributeName = attribute.name.toLowerCase();
        const isAllowed = allowedAttributes[tagName]?.has(attributeName) ?? false;
        if (!isAllowed) {
          element.removeAttribute(attribute.name);
        }
      });

      if (tagName === "a") {
        const href = element.getAttribute("href") || "";
        const isSafeHref = /^(https?:|mailto:|tel:|\/)/i.test(href);
        if (!isSafeHref) {
          element.removeAttribute("href");
        }
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }

    Array.from(node.childNodes).forEach(sanitizeNode);
  };

  Array.from(root.childNodes).forEach(sanitizeNode);
  return root.innerHTML;
}
