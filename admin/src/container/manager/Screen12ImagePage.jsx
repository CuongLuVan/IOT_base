import React from 'react';

const styles = {
  root: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    minHeight: 'calc(100vh - 64px)',
  },
  image: {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
    margin: '0 auto',
    backgroundColor: '#fff',
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  },
};

const buildScreenPage = (resourceName, imageFile) => {
  const ScreenPage = () => (
    <div style={styles.root}>
      <img
        alt={resourceName}
        src={`/image/screen12/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen12Page1 = buildScreenPage('screen12_1', 'screen12_1.jpg');
export const Screen12Page2 = buildScreenPage('screen12_2', 'screen12_2.jpg');
export const Screen12Page3 = buildScreenPage('screen12_3', 'screen12_3.jpg');
export const Screen12Page4 = buildScreenPage('screen12_4', 'screen12_4.jpg');
export const Screen12Page5 = buildScreenPage('screen12_5', 'screen12_5.jpg');
export const Screen12Page6 = buildScreenPage('screen12_6', 'screen12_6.jpg');
