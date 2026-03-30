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
    
    // Precios y Costos
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
    weightUnit?: string;
    requiresShipping?: boolean;
    logisticService?: string;
    
    // Inclusiones e Imágenes
    includedPrimary?: boolean;
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