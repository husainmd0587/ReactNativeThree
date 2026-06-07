import React from 'react';
import PdfViewer from '../../../utils/components/PdfViewer';

const DescriptionScreen = ({ navigation }) => {
  return (
    <PdfViewer
      navigation={navigation}
      title="Automobile Notes"
      pdfUrl="https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/automobile/intro/automobile.pdf"
      footerText="AUTOMOBILE PDF"
    />
  );
};

export default DescriptionScreen;