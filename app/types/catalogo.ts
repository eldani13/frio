export interface Catalogo {
    id?: string;               // ID de documento en Firebase
    numericId: number;         // Autonumérico
    code: string;              // Base 36
    /**
     * Código de correlación con ubicaciones en almacenamiento (mín. 4 dígitos con ceros).
     * No se muestra en la UI; primarios y secundarios lo reciben al crear/importar.
     */
    almacenProductCode?: string;
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
    
    /** Precio de referencia (catálogo e import Excel `precio` / `price`). */
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
     * Cómo mostrar cantidades del producto en la app.
     * Incluye presets (`cantidad`, `peso`, `bolsas`, …); ver `UNIDAD_VIS_CATALOGO_OPCIONES`.
     */
    unidadVisualizacion?: string;
    /**
     * Regla de conversión primario → secundario (alta desde «Crear secundario» o edición).
     * En bodega el insumo se trabaja en kg: `cantidadPrimario` = kg de referencia (típ. 1) y
     * `unidadesSecundario` = unidades de secundario por esa referencia (= 1000 / g por unidad).
     */
    reglaConversionCantidadPrimario?: number;
    reglaConversionUnidadesSecundario?: number;
    /** % de merma típica (0–100) asociada al secundario; referencia al crear procesamiento. */
    mermaPct?: number;
    requiresShipping?: boolean;
    logisticService?: string;
    
    // Inclusiones e Imágenes
    /** @deprecated Preferir `includedPrimarioCatalogoId`. */
    includedPrimary?: boolean;
    /** Id de documento en `clientes/{id}/productos` del producto primario vinculado (p. ej. secundarios). */
    includedPrimarioCatalogoId?: string;
    /**
     * Regla de tres legacy (opcional): la regla vigente para nuevas solicitudes se define al crear la orden de procesamiento.
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