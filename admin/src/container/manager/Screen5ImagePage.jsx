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
        src={`/image/screen5/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen5Page1 = buildScreenPage('screen5_1', 'screen5_1.jpg');
export const Screen5Page2 = buildScreenPage('screen5_2', 'screen5_2.jpg');
export const Screen5Page3 = buildScreenPage('screen5_3', 'screen5_3.jpg');
export const Screen5Page4 = buildScreenPage('screen5_4', 'screen5_4.jpg');
export const Screen5Page5 = buildScreenPage('screen5_5', 'screen5_5.jpg');
export const Screen5Page6 = buildScreenPage('screen5_6', 'screen5_6.jpg');
