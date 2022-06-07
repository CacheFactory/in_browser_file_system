interface NavigateOptions {
  missingPath?: (folderNameToMake: string, pwdRet: Folder) => Folder;
  atPath?: (pwdRet: Folder) => void;
  atFolder?: (pwdRet: Folder) => void;
}

export class FileSystem {
  rootFolder: Folder;
  pwd: Folder;
  constructor() {
    this.rootFolder = new Folder("");
    this.pwd = this.rootFolder;
  }

  availableCommands(): string[] {
    return [
      "cd",
      "mkdir",
      "createFile",
      "ls",
      "cat",
      "mv",
      "cp",
      "pwdPath",
      "rm",
    ];
  }

  executeCommand(command: string): string {
    const commandParts = command.split(" ");
    const commandName = commandParts[0];
    const commandArgs = commandParts.slice(1);
    if (this.availableCommands().includes(commandName) ) {
      const commandFn = this[commandName as keyof FileSystem];
      if (commandFn) {
        if((commandFn as Function).length !== commandArgs.length) {
          return `${commandName} requires ${(commandFn as Function).length} arguments`
        }

        let r = (commandFn as Function).apply(this, commandArgs);
        if (Array.isArray(r)) {
          r = r.join(", ");
        }
        return r;
      } else {
        return "Command not found";
      }
    }
    return "Command not found";
  }

  cd(path: string): boolean {
    let tempPwd = this.pwd;
    this._navigate(path, {
      atPath: (pwdRet: Folder) => {
        tempPwd = pwdRet;
      },
    });

    if (this.pwd !== tempPwd) {
      this.pwd = tempPwd;
      return true;
    } else {
      return false;
    }
  }

  mkdir(folderName: string): boolean {
    let success = false;

    this._navigate(folderName, {
      missingPath: (folderNameToMake: string, pwdRet: Folder) => {
        const newFolder = new Folder(folderNameToMake, pwdRet);

        if (newFolder && newFolder.validate()) {
          pwdRet.add(newFolder);
          success = true;
        }
        return newFolder;
      },
    });

    return success;
  }

  rm(name: string): boolean {
    let success = false;
    const [pathToNavigate, entityName] = this._splitPath(name)

    this._navigate(pathToNavigate, {
      atPath: (pwdRet: Folder) => {
        if (entityName) {
          success = pwdRet.remove(entityName);
        }
      },
    });
    return success;
  }

  createFile(name: string, contents: string): boolean {
    let success = false;
    const [pathToNavigate, entityName] = this._splitPath(name)

    if (!entityName) {
      return false;
    }

    this._navigate(pathToNavigate, {
      atPath: (pwdRet: Folder) => {
        const newFile = new File(entityName, contents);
        if (newFile && newFile.validate()) {
          success = pwdRet.add(newFile);
        }
      },
    });
    return success;
  }

  ls(): string[] {
    return this.pwd.list().map((entity) => entity.name);
  }

  cat(name: string): string | undefined {
    const [pathToNavigate, entityName] = this._splitPath(name)
    let file: File | undefined = undefined;

    this._navigate(pathToNavigate, {
      atPath: (pwdRet: Folder) => {
        if (entityName && pwdRet.hasFile(entityName)) {
          file = pwdRet.getFile(entityName) as File;
        }
      },
    });

    if (file) {
      return (file as File).contents;
    }

    return undefined
  }

  chmod(name: string, permissions: string) {
    const file = this.pwd.getFile(name) as File;
    if (file) {
      file.setPermissions(permissions);
    }
  }

  pwdPath(): string {
    if (this.pwd === this.rootFolder) {
      return "/";
    }
    return this.pwd.toString();
  }

  find(name: string) {
    return this.pwd.find(name);
  }

  cp(oldPath: string, newPath: string): boolean {
    return this._move(oldPath, newPath, false);
  }

  mv(oldPath: string, newPath: string): boolean {
    return this._move(oldPath, newPath, true);
  }

  findByRegex(regex: RegExp): string {
    let foundFiles: File[] = [];
    this._walk(this.pwd, (folder: Folder) => {
      let results = folder.getFileRegex(regex);
      if (results.length > 0) {
        foundFiles = results;
        return false;
      }
      return true;
    });

    return foundFiles.map((x) => x.toString()).join(", ");
  }

  walk(path: string, callback: (folder: Folder) => boolean) {
    this._navigate(path, {
      atPath: (pwdRet: Folder) => {
        this._walk(pwdRet, callback);
      },
    });
  }

  _move(oldPath: string, newPath: string, moveOperation: boolean): boolean {
    let success = false
    const [oldPathToNavigate, oldEntityName] = this._splitPath(oldPath)
    const entity = this._getEntity(oldPath);
    const target = this._getEntity(newPath);
    const targetIsFolder = target instanceof Folder;


    if (entity) {
      let [pathToNavigate, entityName] = this._splitPath(newPath)

      if (targetIsFolder) {
        pathToNavigate = newPath;
        entityName = oldEntityName
      }

      this._navigate(pathToNavigate, {
        atPath: (pwdRet: Folder) => {
          const entityClone = entity.clone()
          if (!targetIsFolder && entityName && entityClone.constructor === File) {
            (entityClone as FileSystemEntity).name = entityName;
          }
          if (entityClone.constructor === Folder) {
            (entityClone as Folder).name = entityName
          }
          pwdRet.add(entityClone);
          success = true;
        }
      });

      if (moveOperation && success) {
        this.rm(oldPath);
      }
      this._setParents(this.rootFolder)
    }
    return success;
  }

  _getEntity(path: string): FileSystemEntity | undefined {
    const [pathToNavigate, entityName] = this._splitPath(path)

    let entity: FileSystemEntity | undefined = undefined;
    let success = false

    this._navigate(pathToNavigate, {
      atPath: (pwdRet: Folder) => {
        if (entityName) {
          entity = pwdRet.get(entityName)
          success = true
        }
      },
    });

    if (success) {
      return entity;
    }

    return undefined
  }

  _splitPath(path:string): [string, string] {
    const pathSplit = path.split("/");
    let entityName = pathSplit.pop();

    if (entityName === '') {
      entityName = pathSplit.pop();
    }

    let pathToNavigate = pathSplit.join("/");

    if (pathToNavigate === '' && path[0] === '/') {
      pathToNavigate = '/';
    }

    return [pathToNavigate, entityName || '']; 
  }

  _walk(folder: Folder, callback: (folder: Folder) => boolean) {
    for (let child of folder.children) {
      if (child.constructor === Folder) {
        if (callback(child)) {
          this._walk(child, callback);
        }
      }
    }
  }

  _navigate(path: string, options: NavigateOptions) {
    const currentPwd = this.pwd;
    if (path[0] === "/") {
      this.pwd = this.rootFolder;
    }

    const folders = path.split("/").filter((folder) => folder !== "");

    for (let folderName of folders) {
      if (folderName === "..") {
        if (this.pwd.parent) {
          this.pwd = this.pwd.parent;
        } else {
          this.pwd = currentPwd;
          return false;
        }
      } else if (this.pwd.hasFolder(folderName)) {
        this.pwd = this.pwd.get(folderName) as Folder;
      } else if (!this.pwd.hasFolder(folderName) && options.missingPath) {
        this.pwd = options.missingPath(folderName, this.pwd);
      } else {
        this.pwd = currentPwd;
        return false;
      }
    }
    options.atPath && options.atPath(this.pwd);
    this.pwd = currentPwd;
    return true;
  }

  _setParents(folder: Folder) {
    for(let children of folder.children) {
      if(children.constructor === Folder) {
        (children as Folder).parent = folder;
        this._setParents(children as Folder);
      }
    }
  }
}

class FileSystemEntity {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  validate() {
    return this.name.indexOf("/") === -1;
  }

  clone() {
    return new FileSystemEntity(this.name);
  }
}

export class File extends FileSystemEntity {
  contents: string;
  permissions: string;
  folder: Folder | undefined;
  constructor(name: string, contents: string) {
    super(name);
    this.contents = contents;
    this.permissions = "";
  }

  clone() {
    return new File(this.name, this.contents);
  }

  setPermissions(permissions: string) {
    this.permissions = permissions;
  }

  setFolder(folder: Folder) {
    this.folder = folder;
  }

  toString() {
    if (this.folder) {
      return `${this.folder.toString()}/${this.name}`;
    }
    return this.name;
  }
}

export class Folder extends FileSystemEntity {
  children: FileSystemEntity[];
  parent: Folder | undefined;
  constructor(name: string, parent?: Folder) {
    super(name);
    this.children = [];
    this.parent = parent;
  }

  clone() {
    const folder = new Folder(this.name);
    folder.children = this.children.map((entity) => entity.clone());
    folder.parent = this.parent
    return folder;
  }

  validate() {
    return super.validate() && this.name.indexOf(".") === -1;
  }

  list() {
    return this.children;
  }

  add(entity: FileSystemEntity): boolean {
    if (!this.has(entity.name)) {
      
      if (entity.constructor === File) {
        (entity as File).setFolder(this);
      }

      if (entity.constructor === Folder) {
        (entity as Folder).parent = this;
      }
    
      this.children.push(entity);

      return true;
    } else {
      return false;
    }
  }

  getFileRegex(regex: RegExp): File[] {
    return this.children.filter((entity: FileSystemEntity) => {
      if (entity.constructor === File) {
        let file = entity as File;
        return file.name.match(regex);
      }
      return false;
    }) as File[];
  }

  remove(name: string) {
    const filteredResults = this.children.filter(
      (child) => child.name !== name
    );
    const success = filteredResults.length !== this.children.length;
    this.children = filteredResults;
    return success;
  }

  hasFolder(name: string): boolean {
    return this.children
      .filter((x) => x.constructor === Folder)
      .map((x) => x.name)
      .includes(name);
  }

  hasFile(name: string): boolean {
    return this.children
      .filter((x) => x.constructor === File)
      .map((x) => x.name)
      .includes(name);
  }

  has(name: string): boolean {
    return this.children.map((x) => x.name).includes(name);
  }

  find(name: string): (FileSystemEntity | undefined)[] {
    let results = [];
    if (this.has(name)) {
      results.push(this.get(name));
    }

    for (let child of this.children) {
      if (child.constructor === Folder) {
        const found = (child as Folder).find(name);
        results = results.concat(found);
      }
    }
    return results;
  }

  getFile(name: string): File | undefined {
    return this.children.find(
      (e: FileSystemEntity) => e.name === name && e.constructor === File
    ) as File;
  }

  get(name: string): FileSystemEntity | undefined {
    return this.children.find((e: FileSystemEntity) => e.name === name);
  }

  toString(): string {
    if (!this.parent) {
      return "";
    } else {
      return this.parent.toString() + "/" + this.name;
    }
  }
}
