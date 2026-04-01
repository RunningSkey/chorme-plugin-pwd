const PLATFORM_CONFIG = [
  {
    name: "GitHub",
    sort: 1,
    envs: [
      {
        name: "生产环境",
        url: "https://github.com",
        icon: "https://github.com/favicon.ico",
        accounts: [
          { name: "主账号", username: "your-email@example.com", password: "your-password" }
        ]
      }
    ]
  },
  {
    name: "Gmail",
    sort: 2,
    envs: [
      {
        name: "生产环境",
        url: "https://gmail.com",
        icon: "https://gmail.com/favicon.ico",
        accounts: [
          { name: "", username: "your-email@gmail.com", password: "your-password" }
        ]
      }
    ]
  },
  {
    name: "QQ邮箱",
    sort: 3,
    envs: [
      {
        name: "生产环境",
        url: "https://mail.qq.com",
        icon: "https://mail.qq.com/favicon.ico",
        accounts: [
          { name: "", username: "your-qq-number", password: "your-password" }
        ]
      }
    ]
  },
  {
    name: "阿里云",
    sort: 4,
    envs: [
      {
        name: "生产环境",
        url: "https://aliyun.com",
        icon: "https://aliyun.com/favicon.ico",
        accounts: [
          { name: "", username: "your-aliyun-account", password: "your-password" }
        ]
      }
    ]
  },
  {
    name: "腾讯云",
    sort: 5,
    envs: [
      {
        name: "生产环境",
        url: "https://cloud.tencent.com",
        icon: "https://cloud.tencent.com/favicon.ico",
        accounts: [
          { name: "", username: "your-tencent-account", password: "your-password" }
        ]
      }
    ]
  }
];

function getPlatforms() {
  return PLATFORM_CONFIG;
}

function addPlatform(platform) {
  PLATFORM_CONFIG.push(platform);
}

function removePlatform(name) {
  const index = PLATFORM_CONFIG.findIndex(p => p.name === name);
  if (index > -1) {
    PLATFORM_CONFIG.splice(index, 1);
  }
}