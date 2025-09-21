import Image from '@editorjs/image';

/**
 * Custom Image Tool that extends the default EditorJS Image tool
 * to include size information in the block data
 */
export default class CustomImageTool extends Image {
  private _wrapper: HTMLElement | null = null;
  private _imageElement: HTMLImageElement | null = null;
  private _customData: any;
  private _isApplyingSizes: boolean = false;

  static get toolbox() {
    return {
      title: 'Image',
      icon: '<svg width="17" height="15" viewBox="0 0 336 276" xmlns="http://www.w3.org/2000/svg"><path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v42l67-44 81 72 56-29 42 30zm0 52l-43-30-56 30-81-67-67 49v23c0 19 15 34 34 34h178c17 0 31-13 34-29zM79 0h178c44 0 79 35 79 79v118c0 44-35 79-79 79H79c-44 0-79-35-79-79V79C0 35 35 0 79 0z"/></svg>'
    };
  }

  constructor({ data, config, api, readOnly, block }: any) {
    super({ data, config, api, readOnly, block });
    
    // Store reference to the wrapper for size detection
    this._wrapper = null;
    this._imageElement = null;
    this._customData = data;
  }

  render() {
    const wrapper = super.render();
    this._wrapper = wrapper;
    
    // Debug: Log the data being passed to CustomImageTool (only if dimensions exist)
    if (this._customData.customWidth || this._customData.customHeight || this._customData.width || this._customData.height) {
      console.log('🔧 CustomImageTool render - data:', {
        customWidth: this._customData.customWidth,
        customHeight: this._customData.customHeight,
        width: this._customData.width,
        height: this._customData.height,
        fileWidth: this._customData.file?.width,
        fileHeight: this._customData.file?.height,
        url: this._customData.file?.url || this._customData.url
      });
    }
    
    // Apply dimensions after the image is loaded
    const applyDimensions = () => {
      const imageElement = wrapper.querySelector('img');
      if (imageElement) {
        this._imageElement = imageElement;
        
        // Apply stored dimensions if they exist (check multiple sources)
        const width = this._customData.customWidth || this._customData.width || this._customData.file?.width;
        const height = this._customData.customHeight || this._customData.height || this._customData.file?.height;
        
        if (width && height) {
          // Apply both dimensions with !important to override any existing styles
          imageElement.style.setProperty('width', `${width}px`, 'important');
          imageElement.style.setProperty('height', `${height}px`, 'important');
          imageElement.style.setProperty('max-width', 'none', 'important');
          imageElement.style.setProperty('object-fit', 'contain', 'important');
          imageElement.setAttribute('width', width.toString());
          imageElement.setAttribute('height', height.toString());
          
          console.log('🔧 CustomImageTool: Applied dimensions:', { width, height });
          
          // Force a reflow to ensure changes take effect
          imageElement.offsetHeight;
        } else if (width) {
          // Only width specified - maintain aspect ratio
          imageElement.style.setProperty('width', `${width}px`, 'important');
          imageElement.style.setProperty('max-width', 'none', 'important');
          imageElement.setAttribute('width', width.toString());
          console.log('🔧 CustomImageTool: Applied width:', width);
        } else if (height) {
          // Only height specified - maintain aspect ratio
          imageElement.style.setProperty('height', `${height}px`, 'important');
          imageElement.setAttribute('height', height.toString());
          console.log('🔧 CustomImageTool: Applied height:', height);
        }
        
        // Set up size tracking
        this._setupSizeTracking(imageElement);
      }
    };
    
    // Try to apply dimensions immediately
    applyDimensions();
    
    // Also try after a short delay to ensure the image is fully loaded
    setTimeout(applyDimensions, 100);
    setTimeout(applyDimensions, 500);
    
    return wrapper;
  }

  /**
   * Setup size tracking for the image element
   */
  _setupSizeTracking(imageElement: HTMLImageElement) {
    // Use MutationObserver to detect style changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          this._updateSizeData();
        }
      });
    });

    observer.observe(imageElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    // Also track resize events
    const resizeObserver = new ResizeObserver(() => {
      this._updateSizeData();
    });
    
    resizeObserver.observe(imageElement);
  }

  /**
   * Set flag to prevent save during size application
   */
  setApplyingSizes(flag: boolean) {
    this._isApplyingSizes = flag;
  }

  /**
   * Update the block data with current image dimensions
   */
  _updateSizeData() {
    if (!this._imageElement) return;
    
    const computedStyle = window.getComputedStyle(this._imageElement);
    const width = parseInt(computedStyle.width);
    const height = parseInt(computedStyle.height);
    
    // Only update if dimensions are valid and different
    if (width > 0 && height > 0) {
      if (this._customData.customWidth !== width || this._customData.customHeight !== height) {
        this._customData.customWidth = width;
        this._customData.customHeight = height;
        
        console.log('Updated image block data with size:', {
          width,
          height,
          url: this._customData.file?.url
        });
      }
    }
  }

  /**
   * Save method - includes size information
   */
  save() {
    const data = super.save();
    
    // Don't save during size application to prevent loops
    if (this._isApplyingSizes) {
      return data;
    }
    
    // Ensure size information is included
    if (this._imageElement) {
      const computedStyle = window.getComputedStyle(this._imageElement);
      const width = parseInt(computedStyle.width);
      const height = parseInt(computedStyle.height);
      
      if (width > 0 && height > 0) {
        (data as any).customWidth = width;
        (data as any).customHeight = height;
      }
    }
    
    // Include any existing size data
    if (this._customData.customWidth) {
      (data as any).customWidth = this._customData.customWidth;
    }
    if (this._customData.customHeight) {
      (data as any).customHeight = this._customData.customHeight;
    }
    
    // Only log when not applying sizes to reduce console noise
    if (!this._isApplyingSizes) {
      console.log('Saving image block with data:', data);
    }
    
    return data;
  }

  /**
   * Validation method
   */
  validate(savedData: any) {
    const isValid = super.validate ? super.validate(savedData) : true;
    
    // Additional validation for our custom fields
    if (savedData.customWidth && (typeof savedData.customWidth !== 'number' || savedData.customWidth <= 0)) {
      return false;
    }
    if (savedData.customHeight && (typeof savedData.customHeight !== 'number' || savedData.customHeight <= 0)) {
      return false;
    }

    return isValid;
  }
}