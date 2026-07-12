import React from 'react';
import AppModal from './Modal.jsx';
import Model3D from './glbPreview';

const Modal3D = ({
  visible,
  onClose,
  title = '3D Model Preview',
  height = '85%',
  hideHeader = false,
  ...props
}) => {
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={title}
      hideHeader={hideHeader}
      contentStyle={{ backgroundColor: '#000', height }}
      titleStyle={{ color: '#fff' }}
      headerStyle={{ backgroundColor: '#0F172A' }}
    >
      <Model3D style={{ flex: 1 }} {...props} />
    </AppModal>
  );
};

export default Modal3D;
