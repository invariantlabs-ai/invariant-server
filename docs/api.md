
### Index




| Method | URL |
|--------|-----|
| GET | / |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|

---

### Create Session




| Method | URL |
|--------|-----|
| GET | /session/new |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| id | string |  |

---

### Read Session




| Method | URL |
|--------|-----|
| GET | /session/ |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| id | string |  |

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Read Policies




| Method | URL |
|--------|-----|
| GET | /policy/ |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Create Policy




| Method | URL |
|--------|-----|
| POST | /policy/new |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| session_id | query |  | Required |

##### Request Body
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| rule | string |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| rule | string |  |
| session_id | string |  |
| policy_id | integer |  |

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Analyze Policy




| Method | URL |
|--------|-----|
| POST | /policy/{policy_id}/analyze |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| policy_id | path |  | Required |
| session_id | query |  | Required |

##### Request Body
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| trace | array |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Read Policy




| Method | URL |
|--------|-----|
| GET | /policy/{policy_id} |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| policy_id | path |  | Required |
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| rule | string |  |
| session_id | string |  |
| policy_id | integer |  |

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Update Policy




| Method | URL |
|--------|-----|
| PUT | /policy/{policy_id} |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| policy_id | path |  | Required |
| session_id | query |  | Required |

##### Request Body
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| rule | string |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| rule | string |  |
| session_id | string |  |
| policy_id | integer |  |

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Delete Policy




| Method | URL |
|--------|-----|
| DELETE | /policy/{policy_id} |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| policy_id | path |  | Required |
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Read Monitors




| Method | URL |
|--------|-----|
| GET | /monitor/ |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Create Monitor




| Method | URL |
|--------|-----|
| POST | /monitor/new |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| session_id | query |  | Required |

##### Request Body
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| policy_id | integer |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| policy_id | integer |  |
| session_id | string |  |
| monitor_id | integer |  |
| traces | array |  |

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Read Monitor




| Method | URL |
|--------|-----|
| GET | /monitor/{monitor_id} |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| monitor_id | path |  | Required |
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| policy_id | integer |  |
| session_id | string |  |
| monitor_id | integer |  |
| traces | array |  |

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Add Trace




| Method | URL |
|--------|-----|
| POST | /monitor/{monitor_id} |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| monitor_id | path |  | Required |
| session_id | query |  | Required |

##### Request Body
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| trace | array |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|
| trace | array |  |
| id | integer |  |

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Delete Monitor




| Method | URL |
|--------|-----|
| DELETE | /monitor/{monitor_id} |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| monitor_id | path |  | Required |
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---

### Read Monitor Traces




| Method | URL |
|--------|-----|
| GET | /monitor/{monitor_id}/traces |

#### Parameters
| Name | In | Description | Required |
|------|----|-------------|----------|
| monitor_id | path |  | Required |
| session_id | query |  | Required |

##### Response (200)
| Field | Type | Description |
|-------|------|-------------|

##### Response (422)
| Field | Type | Description |
|-------|------|-------------|
| detail | array |  |

---
