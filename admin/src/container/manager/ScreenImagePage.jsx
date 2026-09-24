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

const mapResourceToImage = resourceName => {
  const map = {
    screen1_1: 'screen1_1.jpg',
    screen1_2: 'screen1_2.jpg',
    screen1_3: 'screen1_3.jpg',
    screen1_4: 'screen1_4.jpg',
    screen1_5: 'screen1_5.jpg',
    screen1_6: 'screen1_6.jpg',
    screen1_7: 'screen1_7.jpg',
  };
  return map[resourceName] || 'screen1_1.jpg';
};

const buildScreenPage = (resourceName, imageFile) => {
  const ScreenPage = () => (
    <div style={styles.root}>
      <img
        alt={`${resourceName}`}
        src={`/image/screen1/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen1Page = buildScreenPage('screen1_1', mapResourceToImage('screen1_1'));
export const Screen2Page = buildScreenPage('screen1_2', mapResourceToImage('screen1_2'));
export const Screen3Page = buildScreenPage('screen1_3', mapResourceToImage('screen1_3'));
export const Screen4Page = buildScreenPage('screen1_4', mapResourceToImage('screen1_4'));
export const Screen5Page = buildScreenPage('screen1_5', mapResourceToImage('screen1_5'));
export const Screen6Page = buildScreenPage('screen1_6', mapResourceToImage('screen1_6'));
export const Screen7Page = buildScreenPage('screen1_7', mapResourceToImage('screen1_7'));
