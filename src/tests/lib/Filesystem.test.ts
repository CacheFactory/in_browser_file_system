import {FileSystem} from '../../lib/FileSystem';

test('adds a folder', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  expect(fs.rootFolder.hasFolder("folder")).toBe(true);
});

test('does not add invalid folder', () => {
  const fs = new FileSystem();
  fs.mkdir("folde/r");
  expect(fs.rootFolder.hasFolder("folder")).toBe(false);
});

test('deletes a folder', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.rm("folder");
  expect(fs.rootFolder.hasFolder("folder")).toBe(false);
});

test('deletes a folder with path', () => {
  const fs = new FileSystem();
  fs.mkdir("/folder/folder2/folder3");
  fs.rm("/folder/folder2/folder3");
  fs.cd("/folder/folder2");
  expect(fs.rootFolder.hasFolder("folder3")).toBe(false);
});

test('changes directory', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  expect(fs.pwd.name).toBe("folder");
  fs.mkdir("folder2");
  fs.cd("folder2");
  expect(fs.pwd.name).toBe("folder2");

  fs.cd("../");
  expect(fs.pwd.name).toBe("folder");

}); 

test('creates a file', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.createFile("/folder/file.txt", "contents");
  expect(fs.cat('/folder/file.txt')).toBe('contents');
})

test('mkdir directory with path', () => {
  const fs = new FileSystem();
  fs.mkdir("folder/folder2/folder3");
  fs.cd("folder");
  fs.cd("folder2");
  fs.cd("folder3");
  expect(fs.pwd.name).toBe("folder3");
  
}); 


test('changes directory to root', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  expect(fs.pwd.name).toBe("folder");
  fs.mkdir("folder2");
  fs.cd("folder2");
  expect(fs.pwd.name).toBe("folder2");

  fs.cd("/");
  expect(fs.pwd.name).toBe("");

  fs.cd("/folder");
  expect(fs.pwd.name).toBe("folder");
}); 


test('lists directory', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  expect(fs.pwd.name).toBe("folder");
  fs.mkdir("folder2");
  fs.cd("folder2");
  expect(fs.pwd.name).toBe("folder2");
  fs.mkdir("folder3");
  fs.mkdir("folder4");
  expect(fs.ls()).toStrictEqual(["folder3","folder4"]);
}); 


test('get a file\'s contents', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  const content = "BLA BLA BLA BLA BLA"
  fs.createFile("file.txt", content);
  expect(fs.cat('file.txt')).toBe(content);
}); 

test('get pwd string', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  fs.mkdir("folder2");
  fs.cd("folder2");
  expect(fs.pwdPath()).toBe("/folder/folder2");
}); 


test('mv a file', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  const content = "BLA BLA BLA BLA BLA"
  fs.createFile("file.txt", content);
  expect(fs.cat('file.txt')).toBe(content);
  fs.mv("file.txt", "/");
  fs.cd("/")
  expect(fs.cat('file.txt')).toBe(content);
  fs.cd("folder");
  expect(fs.cat('file.txt')).toBe(undefined);

}); 

test('cp a file', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  const content = "BLA BLA BLA BLA BLA"
  fs.createFile("file.txt", content);
  expect(fs.cat('file.txt')).toBe(content);
  fs.cp("file.txt", "/");
  fs.cd("/")
  expect(fs.cat('file.txt')).toBe(content);
  fs.cd("folder");
  expect(fs.cat('file.txt')).toBe(content);

}); 

test('cp a file in same directory', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.cd("folder");
  const content = "BLA BLA BLA BLA BLA"
  fs.createFile("file.txt", content);
  expect(fs.cat('file.txt')).toBe(content);
  fs.cp("file.txt", "file2.txt");
  
  expect(fs.cat('file2.txt')).toBe(content);
  expect(fs.cat('file.txt')).toBe(content);

}); 

test('cp a folder in same directory', () => {
  const fs = new FileSystem();
  fs.mkdir('A')
  fs.cp('A', 'B')
  
  expect(fs.ls()).toEqual(['A','B']);

}); 

test('mv a file 2', () => {
  const fs = new FileSystem();
  const content = "BLA BLA BLA BLA BLA"
  fs.createFile("A", content);
  fs.mv("A", "B");
  expect(fs.cat('B')).toBe(content);

}); 

test('mv a file to a new directory', () => {
  const fs = new FileSystem();
  const content = "BLA BLA BLA BLA BLA"
  fs.createFile("A", content);
  fs.mkdir("folder");
  fs.mv("A", "folder");
  fs.cd('folder')
  expect(fs.cat('A')).toBe(content);

}); 

test('mv a folder', () => {
  const fs = new FileSystem();
  fs.mkdir('A')
  fs.mkdir('B')
  fs.mv("A", "B");

  expect(fs.ls()).toEqual(['B']);
  fs.cd('B')
  expect(fs.ls()).toEqual(['A']);
  fs.cd('A')
  
  expect(fs.pwdPath()).toEqual('/B/A');

}); 

test('finds a file', () => {
  const fs = new FileSystem();
  fs.mkdir("folder");
  fs.createFile("file.txt", "");
  fs.cd("folder");
  expect(fs.pwd.name).toBe("folder");
  fs.mkdir("folder2");
  fs.cd("folder2");
  expect(fs.pwd.name).toBe("folder2");
  fs.createFile("file.txt", "");
  fs.cd("/")

  const results = fs.find("file.txt");
  expect(results.length).toBe(2);
  expect(results[0] && results[0].name).toBe("file.txt");
  expect(results[1] && results[1].name).toBe("file.txt");
}); 

test('finds a file by regex', () => {
  const fs = new FileSystem();
  fs.mkdir("/folder/folder2/folder3/folder4");
  fs.cd("/folder/folder2")
  fs.createFile("a.txt", "");
  fs.cd("/folder/folder2/folder3/folder4")
  fs.createFile("aaaaaa", "");
  fs.cd('/')
  const results = fs.findByRegex(/a/g);
  expect(results).toBe("/folder/folder2/a.txt");
  fs.cd('/folder/folder2/folder3/')
  const results2 = fs.findByRegex(/a/g);
  expect(results2).toBe("/folder/folder2/folder3/folder4/aaaaaa");
}); 
