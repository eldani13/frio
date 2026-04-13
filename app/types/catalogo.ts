export interface Catalogo {
    id?: string;               // ID de documento en Firebase
    numericId: number;         // Autonumérico
    code: string;              // Base 36
    createdAt: number;
    
    // Campos del formulario
    title: string;
    slug?: string;
    description: string;
    provider: string;
    category: string;
    productType: string;
    tags?: string;
    publishedOnline?: boolean; // Generalmente estos campos son booleanos en e-commerce
    status: string;
    sku?: string;
    barcode?: string;
    
    // Opciones y variantes
    optionName1?: string;
    optionValue1?: string;
    linkedOption1?: string;
    
    /** @deprecated Precio de venta: no se edita en catálogo (menú). Persistencia legacy. */
    price?: number;
    internationalPrice?: number;
    compareAtPrice?: number;
    compareAtPriceIntl?: number;
    costPerItem?: number;
    
    // Inventario y Logística
    chargeTax?: boolean;
    inventoryTracker?: string;
    inventoryQty?: number;
    continueSelling?: boolean;
    weightValue?: number;
    /** @deprecated Preferir `unidadVisualizacion`. Se mantiene por datos antiguos. */
    weightUnit?: string;
    /**
     * Cómo mostrar cantidades del producto en la app (obligatorio en formularios nuevos).
     * Valores: `cantidad` | `peso`
     */
    unidadVisualizacion?: "cantidad" | "peso";
    requiresShipping?: boolean;
    logisticService?: string;
    
    // Inclusiones e Imágenes
    /** @deprecated Preferir `includedPrimarioCatalogoId`. */
    includedPrimary?: boolean;
    /** Id de documento en `clientes/{id}/productos` del producto primario vinculado (p. ej. secundarios). */
    includedPrimarioCatalogoId?: string;
    /**
     * Regla de tres (solo secundario): con esta cantidad de insumo del primario (en la unidad de visualización del primario)
     * se obtienen `conversionUnidadesSecundario` unidades de este producto.
     */
    conversionCantidadPrimario?: number;
    conversionUnidadesSecundario?: number;
    includedInternational?: boolean;
    productImageUrl?: string;
    imagePosition?: number;
    imageAlt?: string;
    variantImageUrl?: string;
    
    // Otros y SEO
    giftCard?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    googleShoppingCategory?: string;
    metacampos?: string;
    codeCuenta: string;
  }