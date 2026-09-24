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
        src={`/image/screen10/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen10Page1 = buildScreenPage('screen10_1', 'screen10_1.jpg');
export const Screen10Page2 = buildScreenPage('screen10_2', 'screen10_2.jpg');
export const Screen10Page3 = buildScreenPage('screen10_3', 'screen10_3.jpg');
export const Screen10Page4 = buildScreenPage('screen10_4', 'screen10_4.jpg');
export const Screen10Page5 = buildScreenPage('screen10_5', 'screen10_5.jpg');
export const Screen10Page6 = buildScreenPage('screen10_6', 'screen10_6.jpg');
export const Screen10Page7 = buildScreenPage('screen10_7', 'screen10_7.jpg');
