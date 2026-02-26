/**
 * Stream Config Screen
 * Pantalla de configuración del stream antes de iniciarlo
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../atoms/Text';
import { Input } from '../../atoms/Input';
import { ProductListItem, Product } from '../../molecules/ProductListItem';
import { ArrowLeft, Plus, Video, Save } from 'lucide-react-native';
import { storage } from '../../../utils/storage';

interface StreamConfigScreenProps {
  onBack?: () => void;
  onStartStream?: (config: StreamConfig) => void;
  draft?: StreamConfig | null; // Borrador para cargar
}

export interface StreamConfig {
  title: string;
  description: string;
  products: Product[];
}

export const StreamConfigScreen: React.FC<StreamConfigScreenProps> = ({ 
  onBack,
  onStartStream,
  draft = null,
}) => {
  // Stream info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productUnit, setProductUnit] = useState<'unidad' | 'lote'>('unidad');

  // Cargar borrador si existe
  useEffect(() => {
    if (draft) {
      setTitle(draft.title || '');
      setDescription(draft.description || '');
      setProducts(draft.products || []);
    } else {
      // Intentar cargar desde storage
      loadDraftFromStorage();
    }
  }, [draft]);

  const loadDraftFromStorage = async () => {
    try {
      const savedDraft = await storage.getStreamDraft();
      if (savedDraft) {
        setTitle(savedDraft.title || '');
        setDescription(savedDraft.description || '');
        setProducts(savedDraft.products || []);
      }
    } catch (error) {
      console.error('Error al cargar borrador:', error);
    }
  };

  const handleSaveDraft = async () => {
    const draftData: StreamConfig = {
      title,
      description,
      products,
    };

    try {
      await storage.saveStreamDraft(draftData);
      Alert.alert('Éxito', 'Borrador guardado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el borrador');
    }
  };

  const handleAddProduct = () => {
    // Validaciones
    if (!productName.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del producto');
      return;
    }
    if (!productDescription.trim()) {
      Alert.alert('Error', 'Ingresa la descripción del producto');
      return;
    }
    if (!productPrice || parseFloat(productPrice) <= 0) {
      Alert.alert('Error', 'Ingresa un precio válido');
      return;
    }
    if (!productQuantity || parseInt(productQuantity) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    const newProduct: Product = {
      id: Date.now().toString(),
      name: productName,
      description: productDescription,
      price: parseFloat(productPrice),
      quantity: parseInt(productQuantity),
      unit: productUnit,
    };

    setProducts([...products, newProduct]);

    // Limpiar formulario
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductQuantity('');
    setProductUnit('unidad');
    setShowProductForm(false);
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Estás seguro de que quieres eliminar este producto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setProducts(products.filter(p => p.id !== productId));
          },
        },
      ]
    );
  };

  const handleStartStream = async () => {
    const config: StreamConfig = {
      title,
      description,
      products,
    };

    // Eliminar borrador al iniciar el stream
    try {
      await storage.deleteStreamDraft();
    } catch (error) {
      console.error('Error al eliminar borrador:', error);
    }

    if (onStartStream) {
      onStartStream(config);
    } else {
      Alert.alert(
        'Stream Configurado',
        `Título: ${title}\nProductos: ${products.length}`,
        [{ text: 'OK' }]
      );
    }
  };

  const isFormValid = () => {
    return title.trim() !== '' && description.trim() !== '';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text variant="h2" className="flex-1 text-gray-900 font-bold ml-3">
          Configurar Stream
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stream Info Section */}
          <View style={styles.section}>
            <Text variant="h3" className="text-gray-900 font-semibold mb-4">
              Información del Stream
            </Text>

            <View style={styles.inputGroup}>
              <Text variant="body" className="text-gray-700 mb-2 font-medium">
                Título del Stream *
              </Text>
              <Input
                placeholder="Ej: Liquidación de Verano 2026"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text variant="body" className="text-gray-700 mb-2 font-medium">
                Descripción *
              </Text>
              <Input
                placeholder="Describe tu stream y lo que vas a ofrecer..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={styles.textArea}
                maxLength={500}
              />
              <Text variant="caption" className="text-gray-400 mt-1 text-right">
                {description.length}/500
              </Text>
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text variant="h3" className="text-gray-900 font-semibold">
                  Productos a Vender
                </Text>
                <Text variant="caption" className="text-gray-500 mt-1">
                  Opcional: agrega productos para vender durante el stream
                </Text>
              </View>
              <View style={styles.productCount}>
                <Text variant="caption" className="text-primary-600 font-bold">
                  {products.length}
                </Text>
              </View>
            </View>

            {/* Products List */}
            {products.length > 0 && (
              <View style={styles.productsList}>
                {products.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    onDelete={() => handleDeleteProduct(product.id)}
                  />
                ))}
              </View>
            )}

            {/* Add Product Form */}
            {!showProductForm ? (
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => setShowProductForm(true)}
                activeOpacity={0.7}
              >
                <Plus size={20} color="#2563eb" />
                <Text variant="body" className="text-primary-600 font-semibold ml-2">
                  Agregar Producto
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.productForm}>
                <View style={styles.formHeader}>
                  <Text variant="body" className="text-gray-900 font-semibold">
                    Nuevo Producto
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text variant="body" className="text-gray-700 mb-2">
                    Nombre del Producto *
                  </Text>
                  <Input
                    placeholder="Ej: Remera Deportiva"
                    value={productName}
                    onChangeText={setProductName}
                    maxLength={100}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text variant="body" className="text-gray-700 mb-2">
                    Descripción *
                  </Text>
                  <Input
                    placeholder="Características del producto..."
                    value={productDescription}
                    onChangeText={setProductDescription}
                    multiline
                    numberOfLines={3}
                    maxLength={300}
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text variant="body" className="text-gray-700 mb-2">
                      Precio *
                    </Text>
                    <Input
                      placeholder="0"
                      value={productPrice}
                      onChangeText={setProductPrice}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <Text variant="body" className="text-gray-700 mb-2">
                      Cantidad *
                    </Text>
                    <Input
                      placeholder="0"
                      value={productQuantity}
                      onChangeText={setProductQuantity}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Unit Selector */}
                <View style={styles.inputGroup}>
                  <Text variant="body" className="text-gray-700 mb-2">
                    Tipo de Venta *
                  </Text>
                  <View style={styles.unitSelector}>
                    <TouchableOpacity
                      style={[
                        styles.unitOption,
                        productUnit === 'unidad' && styles.unitOptionActive,
                      ]}
                      onPress={() => setProductUnit('unidad')}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="body"
                        className={
                          productUnit === 'unidad'
                            ? 'text-primary-600 font-semibold'
                            : 'text-gray-600'
                        }
                      >
                        Por Unidad
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.unitOption,
                        productUnit === 'lote' && styles.unitOptionActive,
                      ]}
                      onPress={() => setProductUnit('lote')}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="body"
                        className={
                          productUnit === 'lote'
                            ? 'text-primary-600 font-semibold'
                            : 'text-gray-600'
                        }
                      >
                        Por Lote
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowProductForm(false);
                      setProductName('');
                      setProductDescription('');
                      setProductPrice('');
                      setProductQuantity('');
                      setProductUnit('unidad');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text variant="body" className="text-gray-600 font-medium">
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleAddProduct}
                    activeOpacity={0.7}
                  >
                    <Text variant="body" className="text-white font-semibold">
                      Agregar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Spacer for button */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {/* Save Draft Button */}
          <TouchableOpacity
            style={styles.saveDraftButton}
            onPress={handleSaveDraft}
            activeOpacity={0.8}
          >
            <Save size={18} color="#6b7280" />
            <Text variant="body" className="text-gray-600 font-semibold ml-2">
              Guardar Borrador
            </Text>
          </TouchableOpacity>

          {/* Start Stream Button */}
          <TouchableOpacity
            style={[
              styles.startButton,
              !isFormValid() && styles.startButtonDisabled,
            ]}
            onPress={handleStartStream}
            disabled={!isFormValid()}
            activeOpacity={0.8}
          >
            <Video size={20} color="#ffffff" />
            <Text variant="body" className="text-white font-bold ml-2">
              {isFormValid() 
                ? 'Iniciar Stream' 
                : 'Completa título y descripción para iniciar'
              }
            </Text>
          </TouchableOpacity>
          
          {!isFormValid() && (
            <Text variant="caption" className="text-gray-500 text-center mt-2">
              Necesitas título y descripción para iniciar el stream
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  productsList: {
    marginBottom: 16,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  productForm: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formHeader: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  unitOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  saveDraftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#16a34a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
});
