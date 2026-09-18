export interface Product { id: string; goodsId: string; name: string; price: number; image?: string; learnStatus: string; description?: string }
export interface KnowledgeDocument { document_id?: string; question: string; answer: string; enabled: boolean; keywords: string[] }
export interface KnowledgeBase { binding_id: number; name: string; description?: string; document_count: number; shop_bindings: Array<{ id: number | string; name?: string }>; documents?: KnowledgeDocument[] }
export interface GoodsPayload { shop_id: number; goods_id: string; platform_en: string; name: string; price: number; images: string[]; description?: string; goods_url?: string; sku_list?: Array<{ sku_id: string; sku_name: string; sku_price: number }> }
export interface LearnResult { message: string; goods_count?: number }
type Request = <T>(path: string, init?: RequestInit) => Promise<T>
export function resourceClient(request: Request) {
  const post = <T>(path: string, body: unknown, method = 'POST') => request<T>(path, { method, body: JSON.stringify(body) })
  return {
    async listProducts(shopId: string, platformId: string, page = 1, keyword = '') {
      const query = new URLSearchParams({ shop_id: shopId, platform_en: platformId, page: String(page), page_size: '20', keyword })
      const result = await request<{ items?: Record<string, unknown>[]; list?: Record<string, unknown>[]; total: number }>(`goods/list?${query}`)
      return { total: result.total ?? 0, items: (result.items ?? result.list ?? []).map((row): Product => ({ id: String(row.id), goodsId: String(row.goods_id), name: String(row.name ?? row.title ?? ''), price: Number(row.price ?? 0), image: (row.img ?? (row.images as string[] | undefined)?.[0]) as string | undefined, learnStatus: String(row.learn_status ?? '未开始'), description: row.description as string | undefined })) }
    },
    syncProductIds: (rows: Array<{ shop_id: number; goods_id: string; platform_en: string }>) => post<unknown>('goods/syncIds', rows),
    syncProduct: (product: GoodsPayload) => post<unknown>('goods/syncDetail', product),
    learnProducts: (shopId: number, platformId: string) => post<LearnResult>('goods/learn-shop', { shop_id: shopId, platform_en: platformId }),
    listKnowledge: (page = 1, search = '') => request<{ knowledge_bases: KnowledgeBase[]; total: number }>(`knowledge-base/list?${new URLSearchParams({ page: String(page), page_size: '20', search })}`),
    saveKnowledge: (body: { name: string; description: string; shop_bindings: Array<{ id: number }> }, id?: number) => post<KnowledgeBase>(id ? `knowledge-base/${id}` : 'knowledge-base/create', body, id ? 'PUT' : 'POST'),
    deleteKnowledge: (id: number) => request<unknown>(`knowledge-base/${id}`, { method: 'DELETE' }),
    listDocuments: (id: number, page = 1) => request<{ documents: KnowledgeDocument[]; total: number }>(`knowledge-base/${id}/documents?page=${page}&page_size=20`),
    saveDocument: (id: number, body: KnowledgeDocument) => post<KnowledgeDocument>(`knowledge-base/${id}/documents${body.document_id ? `/${encodeURIComponent(body.document_id)}` : ''}`, body, body.document_id ? 'PUT' : 'POST'),
    deleteDocument: (id: number, documentId: string) => request<unknown>(`knowledge-base/${id}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' })
  }
}
